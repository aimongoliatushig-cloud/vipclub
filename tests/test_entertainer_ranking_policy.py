import copy
import json
import unittest
from datetime import datetime
from decimal import Decimal
from pathlib import Path


POLICY_PATH = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "entertainer-ranking-weights.json"
)
BENCHMARK_SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "entertainer-ranking-sales-benchmarks.schema.json"
)
BENCHMARK_EXAMPLE_PATH = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "entertainer-ranking-sales-benchmarks.example.json"
)
SHIFT_EFFORT_SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "entertainer-ranking-shift-effort.schema.json"
)
SHIFT_PENALTY_SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "entertainer-ranking-shift-penalty.schema.json"
)
ATTENDANCE_PENALTY_SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "entertainer-ranking-attendance-penalties.schema.json"
)
INTERNAL_TEAM_MESSAGE_SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "internal-team-messages.schema.json"
)
CUSTOMER_MESSAGE_SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "customer-entertainer-messages.schema.json"
)

EXPECTED_WEIGHTS = {
    "attendance": 10,
    "customer_complaints": 15,
    "sales": 40,
    "entertaining_skill": 5,
    "cleanliness_beauty": 5,
    "shift_effort": 10,
    "personal_development": 5,
    "entertainer_attitude": 10,
}
EXPECTED_RANK_THRESHOLDS = [
    {
        "id": "level_1",
        "label": "Level 1",
        "description": "Highest performer",
        "ranked": True,
        "minInclusive": 90,
        "maxInclusive": 100,
    },
    {
        "id": "level_2",
        "label": "Level 2",
        "ranked": True,
        "minInclusive": 80,
        "maxExclusive": 90,
    },
    {
        "id": "level_3",
        "label": "Level 3",
        "ranked": True,
        "minInclusive": 70,
        "maxExclusive": 80,
    },
    {
        "id": "rookie",
        "label": "Rookie / unranked entertainer",
        "ranked": False,
        "minInclusive": 0,
        "maxExclusive": 70,
    },
]
RANKED_LEVEL_IDS = ("level_1", "level_2", "level_3")


def weighted_contribution(normalized_score, weight_percent):
    return (
        Decimal(str(normalized_score))
        * Decimal(str(weight_percent))
        / Decimal("100")
    )


def classify_daily_score(policy, score):
    score = Decimal(str(score))
    score_range = policy["scoreScale"]
    if score < Decimal(str(score_range["minInclusive"])) or score > Decimal(
        str(score_range["maxInclusive"])
    ):
        raise ValueError("daily weighted score is outside the inclusive 0-100 range")

    for threshold in policy["rankThresholds"]:
        if score < Decimal(str(threshold["minInclusive"])):
            continue
        if "maxInclusive" in threshold and score <= Decimal(
            str(threshold["maxInclusive"])
        ):
            return threshold["id"]
        if "maxExclusive" in threshold and score < Decimal(
            str(threshold["maxExclusive"])
        ):
            return threshold["id"]
    raise ValueError("rank thresholds do not cover the valid score")


def make_valid_sales_benchmarks(branch_id, base_minimum):
    months = []
    for month in range(1, 13):
        seasonal_offset = month * 100_000
        level_1_minimum = base_minimum + seasonal_offset
        months.append(
            {
                "month": month,
                "levels": {
                    "level_1": {
                        "minimum": level_1_minimum,
                        "maximum": level_1_minimum + 2_000_000,
                    },
                    "level_2": {
                        "minimum": level_1_minimum - 2_000_000,
                        "maximum": level_1_minimum,
                    },
                    "level_3": {
                        "minimum": level_1_minimum - 4_000_000,
                        "maximum": level_1_minimum - 2_000_000,
                    },
                    "rookie": {"handling": "no_sales_benchmark"},
                },
            }
        )
    return {
        "branchId": branch_id,
        "currency": "MNT",
        "calendarYear": 2026,
        "effectiveFrom": "2026-01-01",
        "effectiveTo": "2026-12-31",
        "version": "test-v1",
        "configuredBy": {
            "userId": f"manager-{branch_id}",
            "role": "branch_manager",
            "authorizedBranchId": branch_id,
        },
        "configuredAt": "2026-01-01T00:00:00Z",
        "auditHistory": [
            {
                "actorUserId": f"manager-{branch_id}",
                "actorRole": "branch_manager",
                "timestamp": "2026-01-01T00:00:00Z",
                "version": "test-v1",
                "action": "created",
            }
        ],
        "months": months,
    }


def validate_sales_benchmarks(configuration, authorized_branch_id=None):
    required_metadata = {
        "branchId",
        "currency",
        "calendarYear",
        "effectiveFrom",
        "effectiveTo",
        "version",
        "configuredBy",
        "configuredAt",
        "auditHistory",
    }
    if not required_metadata.issubset(configuration):
        raise ValueError("missing benchmark metadata")
    if configuration["configuredBy"]["role"] != "branch_manager":
        raise ValueError("only a branch manager may configure benchmarks")
    if configuration["configuredBy"]["authorizedBranchId"] != configuration["branchId"]:
        raise ValueError("manager is not authorized for the configured branch")
    if authorized_branch_id is not None and configuration["branchId"] != authorized_branch_id:
        raise ValueError("cross-branch configuration is forbidden")
    if not configuration["auditHistory"]:
        raise ValueError("audit history is required")

    months = configuration.get("months", [])
    if sorted(month["month"] for month in months) != list(range(1, 13)):
        raise ValueError("months 1 through 12 are each required exactly once")

    for month in months:
        levels = month["levels"]
        if set(levels) != {*RANKED_LEVEL_IDS, "rookie"}:
            raise ValueError("ranked ranges and Rookie handling are required")
        for level_id in RANKED_LEVEL_IDS:
            benchmark = levels[level_id]
            minimum = Decimal(str(benchmark["minimum"]))
            maximum = Decimal(str(benchmark["maximum"]))
            if minimum < 0 or maximum < 0 or minimum > maximum:
                raise ValueError("benchmark ranges must be non-negative and ordered")

        for higher, lower in zip(RANKED_LEVEL_IDS, RANKED_LEVEL_IDS[1:]):
            if (
                Decimal(str(levels[higher]["minimum"]))
                < Decimal(str(levels[lower]["minimum"]))
                or Decimal(str(levels[higher]["maximum"]))
                < Decimal(str(levels[lower]["maximum"]))
            ):
                raise ValueError("higher levels cannot have lower benchmark endpoints")

        rookie = levels["rookie"]
        if rookie.get("handling") == "separate_range":
            minimum = Decimal(str(rookie["minimum"]))
            maximum = Decimal(str(rookie["maximum"]))
            if minimum < 0 or maximum < 0 or minimum > maximum:
                raise ValueError("Rookie range is invalid")
        elif rookie.get("handling") != "no_sales_benchmark":
            raise ValueError("Rookie handling must be explicit")
    return True


def attitude_score_for_day(component, scoring_date, incident_decision=None):
    if incident_decision is None or incident_decision.get("scoringDate") != scoring_date:
        return Decimal(str(component["defaultScore"]))

    required = set(component["requiredAuditFields"])
    if not required.issubset(incident_decision):
        raise ValueError("attitude incident decision is missing audit metadata")
    if incident_decision["managerRole"] != component["incidentDecisionRole"]:
        raise ValueError("only a branch manager may finalize an attitude incident")
    if incident_decision["effectiveDate"] != scoring_date:
        raise ValueError("attitude deduction must be isolated to its scoring day")

    finding = incident_decision["finding"]
    deduction = Decimal(str(incident_decision["deduction"]))
    resulting_score = Decimal(str(incident_decision["resultingScore"]))
    if deduction < 0 or deduction > 100 or resulting_score < 0 or resulting_score > 100:
        raise ValueError("attitude values must remain within 0-100")
    if finding == "unsubstantiated":
        if deduction != 0 or resulting_score != 100:
            raise ValueError("unsubstantiated allegations cannot reduce attitude")
    elif finding == "substantiated":
        if resulting_score != Decimal("100") - deduction:
            raise ValueError("substantiated result must equal 100 minus the deduction")
    else:
        raise ValueError("attitude finding is invalid")
    return resulting_score


def shift_effort_metrics(item_states):
    if len(item_states) != 7 or not all(type(state) is bool for state in item_states):
        raise ValueError("exactly seven boolean checklist items are required")
    completed = sum(item_states)
    missed = 7 - completed
    component_score = Decimal(completed) / Decimal("7") * Decimal("100")
    contribution = component_score * Decimal("10") / Decimal("100")
    return {
        "completedCount": completed,
        "missedCount": missed,
        "componentScoreUnrounded": component_score,
        "weightedContributionUnrounded": contribution,
    }


def validate_shift_submission(record):
    item_ids = [item["itemId"] for item in record["items"]]
    states = [item["completed"] for item in record["items"]]
    if len(item_ids) != len(set(item_ids)):
        raise ValueError("checklist item identifiers must be unique")
    metrics = shift_effort_metrics(states)
    if record["completedCount"] != metrics["completedCount"]:
        raise ValueError("completed count does not match items")
    if record["missedCount"] != metrics["missedCount"]:
        raise ValueError("missed count does not match items")
    submitter = record["submittedBy"]
    if submitter["role"] not in {"branch_manager", "lead_entertainer"}:
        raise ValueError("submitter role is not authorized")
    if submitter["authorizedBranchId"] != record["branchId"]:
        raise ValueError("cross-branch shift submission is forbidden")
    return metrics


def parse_timestamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def make_shift_penalty_setting(branch_id, amount, effective_from, version):
    return {
        "branchId": branch_id,
        "currency": "MNT",
        "amountPerMiss": amount,
        "effectiveFrom": effective_from,
        "version": version,
        "status": "active",
        "configuredBy": {
            "userId": f"manager-{branch_id}",
            "role": "branch_manager",
            "authorizedBranchId": branch_id,
        },
        "configuredAt": effective_from,
        "reason": "Approved branch setting",
        "auditHistory": [{"version": version}],
    }


def validate_shift_penalty_setting(setting, authorized_branch_id=None):
    if Decimal(str(setting["amountPerMiss"])) < 0:
        raise ValueError("amount per miss cannot be negative")
    actor = setting["configuredBy"]
    if actor["role"] != "branch_manager":
        raise ValueError("only a branch manager may configure the penalty")
    if actor["authorizedBranchId"] != setting["branchId"]:
        raise ValueError("manager is not authorized for the setting branch")
    if authorized_branch_id is not None and setting["branchId"] != authorized_branch_id:
        raise ValueError("cross-branch configuration is forbidden")
    return True


def select_effective_setting(settings, branch_id, scoring_time, shift_configuration_id=None):
    scoring_time = parse_timestamp(scoring_time)
    candidates = []
    for setting in settings:
        if setting["branchId"] != branch_id:
            continue
        if shift_configuration_id is not None and setting.get(
            "shiftConfigurationId"
        ) != shift_configuration_id:
            continue
        if parse_timestamp(setting["effectiveFrom"]) <= scoring_time:
            candidates.append(setting)
    if not candidates:
        raise ValueError("no effective branch setting")
    return max(candidates, key=lambda setting: parse_timestamp(setting["effectiveFrom"]))


def calculate_missed_performance_penalty(item_states, setting):
    metrics = shift_effort_metrics(item_states)
    penalty = Decimal(metrics["missedCount"]) * Decimal(
        str(setting["amountPerMiss"])
    )
    return metrics | {
        "penaltySettingReference": {
            "branchId": setting["branchId"],
            "version": setting["version"],
            "effectiveFrom": setting["effectiveFrom"],
        },
        "penaltyAmountPerMiss": Decimal(str(setting["amountPerMiss"])),
        "penaltyCurrency": setting["currency"],
        "monetaryPenalty": penalty,
    }


def make_attendance_penalty_setting(
    branch_id,
    shift_configuration_id,
    per_minute_amount,
    no_show_amount,
    effective_from,
    version,
):
    return {
        "branchId": branch_id,
        "shiftConfigurationId": shift_configuration_id,
        "requiredReadyTime": "20:00:00+08:00",
        "currency": "MNT",
        "amountPerMinuteLate": per_minute_amount,
        "fixedNoShowAmount": no_show_amount,
        "effectiveFrom": effective_from,
        "version": version,
        "status": "active",
        "configuredBy": {
            "userId": f"manager-{branch_id}",
            "role": "branch_manager",
            "authorizedBranchId": branch_id,
        },
        "configuredAt": effective_from,
        "reason": "Approved attendance penalty setting",
        "auditHistory": [{"version": version}],
    }


def validate_attendance_penalty_setting(setting, authorized_branch_id=None):
    if Decimal(str(setting["amountPerMinuteLate"])) < 0 or Decimal(
        str(setting["fixedNoShowAmount"])
    ) < 0:
        raise ValueError("attendance monetary settings cannot be negative")
    actor = setting["configuredBy"]
    if actor["role"] != "branch_manager":
        raise ValueError("only a branch manager may configure attendance penalties")
    if actor["authorizedBranchId"] != setting["branchId"]:
        raise ValueError("manager is not authorized for the setting branch")
    if authorized_branch_id is not None and setting["branchId"] != authorized_branch_id:
        raise ValueError("cross-branch configuration is forbidden")
    return True


def calculate_attendance_penalty(
    setting,
    scheduled_shift_id,
    required_ready_at,
    actual_arrival_at=None,
    no_show=False,
):
    setting_reference = {
        "branchId": setting["branchId"],
        "shiftConfigurationId": setting["shiftConfigurationId"],
        "version": setting["version"],
        "effectiveFrom": setting["effectiveFrom"],
    }
    common = {
        "scheduledShiftId": scheduled_shift_id,
        "branchId": setting["branchId"],
        "requiredReadyTime": required_ready_at,
        "actualArrivalTime": actual_arrival_at,
        "noShow": no_show,
        "settingReference": setting_reference,
        "currency": setting["currency"],
        "sourceEvidenceReferences": [f"attendance:{scheduled_shift_id}"],
        "correctionReversalLinks": [],
    }

    if no_show:
        amount = Decimal(str(setting["fixedNoShowAmount"]))
        return common | {
            "latenessMinutes": None,
            "latenessPenalty": Decimal("0"),
            "noShowPenalty": amount,
            "totalMonetaryPenalty": amount,
            "settlementLineItems": [
                {
                    "type": "attendance_no_show",
                    "sourceScheduledShiftId": scheduled_shift_id,
                    "settingReference": setting_reference,
                    "amount": amount,
                    "currency": setting["currency"],
                    "netSettlementImpact": -amount,
                }
            ],
            "rankingInputs": {"attendance": False, "noShow": True, "latenessMinutes": None},
        }

    if actual_arrival_at is None:
        raise ValueError("an attended shift requires actual arrival time")
    elapsed_seconds = Decimal(
        str((parse_timestamp(actual_arrival_at) - parse_timestamp(required_ready_at)).total_seconds())
    )
    lateness_minutes = max(Decimal("0"), elapsed_seconds / Decimal("60"))
    amount = lateness_minutes * Decimal(str(setting["amountPerMinuteLate"]))
    lines = []
    if amount > 0:
        lines.append(
            {
                "type": "attendance_lateness",
                "sourceScheduledShiftId": scheduled_shift_id,
                "settingReference": setting_reference,
                "latenessMinutes": lateness_minutes,
                "ratePerMinute": Decimal(str(setting["amountPerMinuteLate"])),
                "amount": amount,
                "currency": setting["currency"],
                "netSettlementImpact": -amount,
            }
        )
    return common | {
        "latenessMinutes": lateness_minutes,
        "latenessPenalty": amount,
        "noShowPenalty": Decimal("0"),
        "totalMonetaryPenalty": amount,
        "settlementLineItems": lines,
        "rankingInputs": {"attendance": True, "noShow": False, "latenessMinutes": lateness_minutes},
    }


def create_internal_team_message(
    message_type,
    sender_employee_id,
    subject_employee_id,
    subject_branch_id,
    text,
    manager_branch_grants,
):
    if message_type not in {"complaint", "compliment"}:
        raise ValueError("internal message type is invalid")
    if not sender_employee_id or not subject_employee_id or not text.strip():
        raise ValueError("sender, selected team member, and text are required")
    deliveries = [
        {"audienceType": "ceo", "recipientId": "ceo-1", "state": "delivered"}
    ]
    deliveries.extend(
        {
            "audienceType": "authorized_branch_manager",
            "recipientId": manager_id,
            "state": "delivered",
        }
        for manager_id, branch_id in manager_branch_grants.items()
        if branch_id == subject_branch_id
    )
    if message_type == "compliment":
        deliveries.append(
            {
                "audienceType": "compliment_recipient",
                "recipientId": subject_employee_id,
                "state": "delivered",
            }
        )
    return {
        "messageId": "internal-message-1",
        "sourceType": "internal_team",
        "messageType": message_type,
        "senderEmployeeId": sender_employee_id,
        "subjectEmployeeId": subject_employee_id,
        "branchId": subject_branch_id,
        "text": text,
        "createdAt": "2026-08-18T12:00:00Z",
        "deliveryStates": deliveries,
        "readStates": [],
        "moderationReviewStatus": "new",
        "senderConfirmation": {"state": "submitted", "managementReviewData": None},
        "routing": {
            "subjectCanView": message_type == "compliment",
            "subjectCanRespond": False,
            "automaticRankingImpact": False,
        },
        "rankingChanges": {},
        "auditHistory": [{"action": "created"}],
    }


def can_view_internal_message(message, viewer_id, viewer_role, authorized_branches=()):
    if message["messageType"] == "complaint" and viewer_id == message["subjectEmployeeId"]:
        return False
    if viewer_role == "ceo":
        return True
    if viewer_role == "branch_manager":
        return message["branchId"] in set(authorized_branches)
    return message["messageType"] == "compliment" and viewer_id == message[
        "subjectEmployeeId"
    ]


def create_customer_message(
    message_type,
    customer_id,
    vip_room_id,
    experience_context,
    selected_entertainer_id,
    validated_branch_id,
    text,
    manager_branch_grants,
):
    if message_type not in {"complaint", "praise"}:
        raise ValueError("customer message type is invalid")
    if not customer_id:
        raise ValueError("authenticated customer identity is required")
    if not vip_room_id:
        raise ValueError("VIP room is required")
    if not any(
        experience_context.get(field)
        for field in ("visitId", "reservationId", "sessionId")
    ):
        raise ValueError("visit, reservation, or session context is required")
    if not selected_entertainer_id or not validated_branch_id or not text.strip():
        raise ValueError("entertainer, routed branch, and text are required")

    deliveries = [
        {"audienceType": "ceo", "recipientId": "ceo-1", "state": "delivered"}
    ]
    deliveries.extend(
        {
            "audienceType": "authorized_branch_manager",
            "recipientId": manager_id,
            "state": "delivered",
        }
        for manager_id, branch_id in manager_branch_grants.items()
        if branch_id == validated_branch_id
    )
    if message_type == "praise":
        deliveries.append(
            {
                "audienceType": "praised_entertainer",
                "recipientId": selected_entertainer_id,
                "state": "delivered",
            }
        )
    return {
        "messageId": "customer-message-1",
        "sourceType": "customer_portal",
        "customerId": customer_id,
        "vipRoomId": vip_room_id,
        "experienceContext": experience_context,
        "selectedEntertainerId": selected_entertainer_id,
        "branchId": validated_branch_id,
        "messageType": message_type,
        "text": text,
        "sourcePortal": "customer_helper_portal",
        "createdAt": "2026-08-18T12:00:00Z",
        "deliveryStates": deliveries,
        "readStates": [],
        "reviewStatus": "new",
        "routing": {
            "entertainerCanView": message_type == "praise",
            "automaticRankingImpact": False,
            "entertainerCustomerContextPolicy": "field_level_policy_required",
        },
        "rankingChanges": {},
        "auditHistory": [{"action": "created"}],
    }


def can_view_customer_message(message, viewer_id, viewer_role, authorized_branches=()):
    if (
        message["messageType"] == "complaint"
        and viewer_id == message["selectedEntertainerId"]
    ):
        return False
    if viewer_role == "ceo":
        return True
    if viewer_role == "branch_manager":
        return message["branchId"] in set(authorized_branches)
    return message["messageType"] == "praise" and viewer_id == message[
        "selectedEntertainerId"
    ]


class EntertainerRankingPolicyContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
        cls.components = {
            component["id"]: component for component in cls.policy["components"]
        }
        cls.benchmark_schema = json.loads(
            BENCHMARK_SCHEMA_PATH.read_text(encoding="utf-8")
        )
        cls.benchmark_example = json.loads(
            BENCHMARK_EXAMPLE_PATH.read_text(encoding="utf-8")
        )
        cls.shift_effort_schema = json.loads(
            SHIFT_EFFORT_SCHEMA_PATH.read_text(encoding="utf-8")
        )
        cls.shift_penalty_schema = json.loads(
            SHIFT_PENALTY_SCHEMA_PATH.read_text(encoding="utf-8")
        )
        cls.attendance_penalty_schema = json.loads(
            ATTENDANCE_PENALTY_SCHEMA_PATH.read_text(encoding="utf-8")
        )
        cls.internal_message_schema = json.loads(
            INTERNAL_TEAM_MESSAGE_SCHEMA_PATH.read_text(encoding="utf-8")
        )
        cls.customer_message_schema = json.loads(
            CUSTOMER_MESSAGE_SCHEMA_PATH.read_text(encoding="utf-8")
        )

    def test_has_exactly_the_eight_canonical_weights(self):
        component_ids = [
            component["id"] for component in self.policy["components"]
        ]
        actual = {
            component_id: component["weightPercent"]
            for component_id, component in self.components.items()
        }
        self.assertEqual(list(EXPECTED_WEIGHTS), component_ids)
        self.assertEqual(EXPECTED_WEIGHTS, actual)

    def test_weights_total_one_hundred_percent(self):
        total = sum(
            component["weightPercent"] for component in self.components.values()
        )
        self.assertEqual(100, total)

    def test_each_factor_contributes_its_weighted_share(self):
        for component_id, weight_percent in EXPECTED_WEIGHTS.items():
            with self.subTest(component=component_id):
                self.assertEqual(
                    Decimal(str(weight_percent)) / Decimal("100"),
                    weighted_contribution(1, weight_percent),
                )

    def test_unit_scores_for_all_factors_produce_unit_total(self):
        contributions = {
            component_id: weighted_contribution(1, weight_percent)
            for component_id, weight_percent in EXPECTED_WEIGHTS.items()
        }
        self.assertEqual(Decimal("1"), sum(contributions.values()))
        self.assertEqual(set(EXPECTED_WEIGHTS), set(contributions))

    def test_personal_development_is_auditable_five_percent_factor(self):
        component = self.components["personal_development"]
        self.assertEqual(5, component["weightPercent"])
        self.assertIn("completed_training", component["sourceSignals"])
        self.assertEqual(Decimal("0.05"), weighted_contribution(1, 5))

    def test_attendance_combines_no_show_and_lateness(self):
        attendance = self.components["attendance"]
        self.assertEqual(10, attendance["weightPercent"])
        self.assertEqual(
            {"attendance", "no_show", "lateness"},
            set(attendance["sourceSignals"]),
        )

    def test_policy_is_daily_and_sales_comes_from_pos(self):
        self.assertTrue(self.policy["dailyScoring"])
        sales = self.components["sales"]
        self.assertEqual("point_of_sale_import", sales["entryMode"])
        self.assertEqual(["verified_pos_attributed_sales"], sales["sourceSignals"])

    def test_entertaining_skill_is_audited_zero_to_one_hundred(self):
        skill = self.components["entertaining_skill"]
        self.assertEqual("latest_audited_level", skill["entryMode"])
        self.assertEqual("use_most_recent_approved_level", skill["dailyValueRule"])
        self.assertEqual(
            {"branch_manager", "lead_entertainer"},
            set(skill["allowedEntryRoles"]),
        )
        self.assertEqual({"min": 0, "max": 100}, skill["scoreRange"])
        self.assertEqual(["audited_skill_assessment"], skill["sourceSignals"])

    def test_cleanliness_is_a_daily_zero_to_one_hundred_assessment(self):
        cleanliness = self.components["cleanliness_beauty"]
        self.assertEqual("manual_daily_assessment", cleanliness["entryMode"])
        self.assertEqual(
            {"branch_manager", "lead_entertainer"},
            set(cleanliness["allowedEntryRoles"]),
        )
        self.assertEqual({"min": 0, "max": 100}, cleanliness["scoreRange"])

    def test_personal_development_reuses_latest_audited_level(self):
        development = self.components["personal_development"]
        self.assertEqual("latest_audited_level", development["entryMode"])
        self.assertEqual(
            "use_most_recent_approved_level", development["dailyValueRule"]
        )
        self.assertEqual(
            {"branch_manager", "lead_entertainer"},
            set(development["allowedEntryRoles"]),
        )
        self.assertEqual({"min": 0, "max": 100}, development["scoreRange"])

    def test_changed_complaints_and_skill_contributions(self):
        self.assertEqual(
            Decimal("0.15"),
            weighted_contribution(1, self.components["customer_complaints"]["weightPercent"]),
        )
        self.assertEqual(
            Decimal("0.05"),
            weighted_contribution(1, self.components["entertaining_skill"]["weightPercent"]),
        )

    def test_attitude_is_incident_based_manager_only_ten_percent_factor(self):
        attitude = self.components["entertainer_attitude"]
        self.assertEqual(10, attitude["weightPercent"])
        self.assertEqual("incident_based_deduction", attitude["entryMode"])
        self.assertEqual(100, attitude["defaultScore"])
        self.assertFalse(attitude["routineDailyEntryRequired"])
        self.assertEqual("branch_manager", attitude["incidentDecisionRole"])
        self.assertEqual({"min": 0, "max": 100}, attitude["scoreRange"])
        self.assertTrue(attitude["evidenceRequired"])
        self.assertEqual(
            {
                "incidentReferences",
                "evidenceReferences",
                "entertainerId",
                "branchId",
                "scoringDate",
                "effectiveDate",
                "managerUserId",
                "managerRole",
                "finding",
                "deduction",
                "resultingScore",
                "reason",
                "timestamp",
                "correctionAppealHistory",
            },
            set(attitude["requiredAuditFields"]),
        )
        self.assertEqual(
            "open_requires_versioned_policy_rule",
            attitude["deductionRubricStatus"],
        )
        self.assertEqual(
            "incident_scoring_day_only_no_carry_forward",
            attitude["penaltyEffectiveWindow"],
        )
        self.assertEqual(Decimal("0.10"), weighted_contribution(1, 10))

    def test_attitude_default_unsubstantiated_substantiated_and_day_reset(self):
        attitude = self.components["entertainer_attitude"]
        self.assertEqual(Decimal("100"), attitude_score_for_day(attitude, "2026-08-18"))
        decision = {
            "incidentReferences": ["internal-message-1"],
            "evidenceReferences": ["evidence-1"],
            "entertainerId": "ent-1",
            "branchId": "branch-a",
            "scoringDate": "2026-08-18",
            "effectiveDate": "2026-08-18",
            "managerUserId": "manager-a",
            "managerRole": "branch_manager",
            "finding": "unsubstantiated",
            "deduction": 0,
            "resultingScore": 100,
            "reason": "Evidence did not substantiate the allegation",
            "timestamp": "2026-08-18T23:00:00Z",
            "correctionAppealHistory": [],
        }
        self.assertEqual(
            Decimal("100"), attitude_score_for_day(attitude, "2026-08-18", decision)
        )
        decision.update(
            finding="substantiated",
            deduction=25,
            resultingScore=75,
            reason="Manager substantiated the incident",
        )
        self.assertEqual(
            Decimal("75"), attitude_score_for_day(attitude, "2026-08-18", decision)
        )
        self.assertEqual(
            Decimal("7.5"), weighted_contribution(75, attitude["weightPercent"])
        )
        self.assertEqual(
            Decimal("100"), attitude_score_for_day(attitude, "2026-08-19", decision)
        )

    def test_attitude_rejects_non_manager_or_out_of_range_decision(self):
        attitude = self.components["entertainer_attitude"]
        decision = {
            "incidentReferences": ["incident-1"],
            "evidenceReferences": ["evidence-1"],
            "entertainerId": "ent-1",
            "branchId": "branch-a",
            "scoringDate": "2026-08-18",
            "effectiveDate": "2026-08-18",
            "managerUserId": "lead-a",
            "managerRole": "lead_entertainer",
            "finding": "substantiated",
            "deduction": 20,
            "resultingScore": 80,
            "reason": "Not authorized",
            "timestamp": "2026-08-18T23:00:00Z",
            "correctionAppealHistory": [],
        }
        with self.assertRaises(ValueError):
            attitude_score_for_day(attitude, "2026-08-18", decision)
        decision.update(managerRole="branch_manager", deduction=110, resultingScore=-10)
        with self.assertRaises(ValueError):
            attitude_score_for_day(attitude, "2026-08-18", decision)

    def test_exact_rank_threshold_configuration(self):
        self.assertEqual(
            {"minInclusive": 0, "maxInclusive": 100},
            self.policy["scoreScale"],
        )
        self.assertEqual(EXPECTED_RANK_THRESHOLDS, self.policy["rankThresholds"])
        self.assertEqual(
            "unrounded_daily_weighted_score",
            self.policy["rankClassificationInput"],
        )

    def test_decimal_rank_boundaries(self):
        expected = {
            "69.99": "rookie",
            "70": "level_3",
            "79.99": "level_3",
            "80": "level_2",
            "89.99": "level_2",
            "90": "level_1",
            "100": "level_1",
        }
        for score, rank_id in expected.items():
            with self.subTest(score=score):
                self.assertEqual(rank_id, classify_daily_score(self.policy, score))

    def test_out_of_range_scores_are_rejected_without_rank(self):
        self.assertEqual(
            "validation_error_no_rank",
            self.policy["outOfRangeScoreTreatment"],
        )
        for score in ("-0.01", "100.01"):
            with self.subTest(score=score):
                with self.assertRaises(ValueError):
                    classify_daily_score(self.policy, score)

    def test_sales_benchmark_schema_requires_twelve_months_and_all_levels(self):
        month_array = self.benchmark_schema["properties"]["months"]
        self.assertEqual(12, month_array["minItems"])
        self.assertEqual(12, month_array["maxItems"])
        levels = self.benchmark_schema["$defs"]["monthBenchmark"]["properties"][
            "levels"
        ]
        self.assertEqual(
            ["level_1", "level_2", "level_3", "rookie"],
            levels["required"],
        )
        self.assertTrue(
            validate_sales_benchmarks(
                make_valid_sales_benchmarks("branch-a", 10_000_000),
                authorized_branch_id="branch-a",
            )
        )

    def test_sales_benchmark_validation_rejects_incomplete_or_invalid_ranges(self):
        base = make_valid_sales_benchmarks("branch-a", 10_000_000)
        invalid_cases = []

        missing_month = copy.deepcopy(base)
        missing_month["months"].pop()
        invalid_cases.append(missing_month)

        negative = copy.deepcopy(base)
        negative["months"][0]["levels"]["level_3"]["minimum"] = -1
        invalid_cases.append(negative)

        reversed_range = copy.deepcopy(base)
        reversed_range["months"][0]["levels"]["level_2"] = {
            "minimum": 5_000_000,
            "maximum": 4_000_000,
        }
        invalid_cases.append(reversed_range)

        wrong_level_order = copy.deepcopy(base)
        wrong_level_order["months"][0]["levels"]["level_2"]["maximum"] = (
            wrong_level_order["months"][0]["levels"]["level_1"]["maximum"]
            + 1
        )
        invalid_cases.append(wrong_level_order)

        missing_rookie = copy.deepcopy(base)
        del missing_rookie["months"][0]["levels"]["rookie"]
        invalid_cases.append(missing_rookie)

        for index, configuration in enumerate(invalid_cases):
            with self.subTest(case=index):
                with self.assertRaises((KeyError, ValueError)):
                    validate_sales_benchmarks(configuration, "branch-a")

    def test_branch_tables_are_independent_for_same_month_and_year(self):
        branch_a = make_valid_sales_benchmarks("branch-a", 10_000_000)
        branch_b = make_valid_sales_benchmarks("branch-b", 12_000_000)
        self.assertTrue(validate_sales_benchmarks(branch_a, "branch-a"))
        self.assertTrue(validate_sales_benchmarks(branch_b, "branch-b"))
        self.assertEqual(branch_a["calendarYear"], branch_b["calendarYear"])
        self.assertEqual(branch_a["months"][0]["month"], branch_b["months"][0]["month"])
        self.assertNotEqual(
            branch_a["months"][0]["levels"]["level_1"],
            branch_b["months"][0]["levels"]["level_1"],
        )
        with self.assertRaises(ValueError):
            validate_sales_benchmarks(branch_b, authorized_branch_id="branch-a")

    def test_january_level_one_example_is_clearly_illustrative(self):
        example = self.benchmark_example
        self.assertTrue(example["illustrativeOnly"])
        self.assertFalse(example["completeConfiguration"])
        self.assertEqual(1, example["calendarMonth"])
        self.assertEqual("level_1", example["rankLevel"])
        self.assertEqual("MNT", example["currency"])
        self.assertEqual(8_000_000, example["minimum"])
        self.assertEqual(10_000_000, example["maximum"])
        self.assertIn("not a universal benchmark", example["warning"])

    def test_shift_effort_formula_for_zero_five_and_seven_completed(self):
        cases = (
            ([False] * 7, 0, Decimal("0"), Decimal("0")),
            ([True] * 5 + [False] * 2, 5, Decimal(5) / 7 * 100, Decimal(5) / 7 * 10),
            ([True] * 7, 7, Decimal("100"), Decimal("10")),
        )
        for states, completed, component, contribution in cases:
            with self.subTest(completed=completed):
                metrics = shift_effort_metrics(states)
                self.assertEqual(completed, metrics["completedCount"])
                self.assertEqual(7 - completed, metrics["missedCount"])
                self.assertEqual(component, metrics["componentScoreUnrounded"])
                self.assertEqual(contribution, metrics["weightedContributionUnrounded"])
                self.assertGreaterEqual(component, 0)
                self.assertLessEqual(component, 100)

    def test_shift_effort_requires_seven_booleans_and_authorized_branch_submitter(self):
        for invalid in ([True] * 6, [True] * 8, [True] * 6 + [1]):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    shift_effort_metrics(invalid)
        record = {
            "entertainerId": "ent-1",
            "branchId": "branch-a",
            "shiftId": "shift-1",
            "scoringDate": "2026-08-18",
            "items": [
                {"itemId": f"performance-{index}", "completed": index <= 5}
                for index in range(1, 8)
            ],
            "completedCount": 5,
            "missedCount": 2,
            "submittedBy": {
                "userId": "lead-a",
                "role": "lead_entertainer",
                "authorizedBranchId": "branch-a",
            },
        }
        metrics = validate_shift_submission(record)
        self.assertEqual(7, metrics["completedCount"] + metrics["missedCount"])
        self.assertEqual(
            ["entertainerId", "branchId", "shiftId", "scoringDate"],
            self.components["shift_effort"]["uniquenessKey"],
        )
        record["submittedBy"]["authorizedBranchId"] = "branch-b"
        with self.assertRaises(ValueError):
            validate_shift_submission(record)

    def test_shift_effort_and_money_formulas_remain_separate(self):
        setting = make_shift_penalty_setting(
            "branch-a", 50_000, "2026-01-01T00:00:00Z", "miss-v1"
        )
        expected_penalties = {0: 0, 1: 50_000, 2: 100_000}
        for missed_count, expected_penalty in expected_penalties.items():
            states = [True] * (7 - missed_count) + [False] * missed_count
            result = calculate_missed_performance_penalty(states, setting)
            self.assertEqual(Decimal(expected_penalty), result["monetaryPenalty"])
            self.assertEqual(
                Decimal(7 - missed_count) / 7 * 100,
                result["componentScoreUnrounded"],
            )
        rich_setting = make_shift_penalty_setting(
            "branch-a", 500_000, "2026-01-01T00:00:00Z", "miss-rich"
        )
        self.assertEqual(
            calculate_missed_performance_penalty([True] * 5 + [False] * 2, setting)[
                "componentScoreUnrounded"
            ],
            calculate_missed_performance_penalty(
                [True] * 5 + [False] * 2, rich_setting
            )["componentScoreUnrounded"],
        )

    def test_shift_penalty_is_branch_specific_non_negative_and_non_retroactive(self):
        branch_a_v1 = make_shift_penalty_setting(
            "branch-a", 10_000, "2026-01-01T00:00:00Z", "a-v1"
        )
        branch_a_v2 = make_shift_penalty_setting(
            "branch-a", 20_000, "2026-08-01T00:00:00Z", "a-v2"
        )
        branch_b = make_shift_penalty_setting(
            "branch-b", 30_000, "2026-01-01T00:00:00Z", "b-v1"
        )
        self.assertTrue(validate_shift_penalty_setting(branch_a_v1, "branch-a"))
        self.assertTrue(validate_shift_penalty_setting(branch_b, "branch-b"))
        with self.assertRaises(ValueError):
            validate_shift_penalty_setting(branch_b, "branch-a")
        negative = make_shift_penalty_setting(
            "branch-a", -1, "2026-01-01T00:00:00Z", "invalid"
        )
        with self.assertRaises(ValueError):
            validate_shift_penalty_setting(negative)

        old_setting = select_effective_setting(
            [branch_a_v1, branch_a_v2], "branch-a", "2026-07-31T23:00:00Z"
        )
        stored = calculate_missed_performance_penalty(
            [True] * 5 + [False] * 2, old_setting
        )
        self.assertEqual(Decimal("20000"), stored["monetaryPenalty"])
        self.assertEqual("a-v1", stored["penaltySettingReference"]["version"])
        self.assertEqual(
            "a-v2",
            select_effective_setting(
                [branch_a_v1, branch_a_v2], "branch-a", "2026-08-18T00:00:00Z"
            )["version"],
        )
        self.assertEqual(Decimal("20000"), stored["monetaryPenalty"])

    def test_missed_performance_settlement_line_keeps_source_linkage(self):
        setting = make_shift_penalty_setting(
            "branch-a", 25_000, "2026-01-01T00:00:00Z", "miss-v1"
        )
        result = calculate_missed_performance_penalty(
            [True] * 5 + [False] * 2, setting
        )
        line = {
            "type": "missed_public_performance",
            "sourceChecklistId": "checklist-1",
            "sourceShiftId": "shift-1",
            "missedCount": result["missedCount"],
            "amountPerMiss": result["penaltyAmountPerMiss"],
            "settingReference": result["penaltySettingReference"],
            "currency": result["penaltyCurrency"],
            "amount": result["monetaryPenalty"],
            "netSettlementImpact": -result["monetaryPenalty"],
            "correctionReversalLinks": [],
        }
        self.assertEqual(Decimal("50000"), line["amount"])
        self.assertEqual(Decimal("-50000"), line["netSettlementImpact"])
        self.assertEqual("checklist-1", line["sourceChecklistId"])
        self.assertNotIn("componentScoreUnrounded", line)

    def test_attendance_schema_confirms_no_show_suppresses_lateness(self):
        validations = " ".join(
            self.attendance_penalty_schema["x-cross-field-validations"]
        )
        self.assertIn("no-show suppresses lateness", validations)
        settings = self.components["attendance"]["financialPenaltySettings"]
        self.assertEqual(
            "no_show_suppresses_lateness_for_same_shift", settings["precedence"]
        )

    def test_attendance_on_time_late_and_no_show_are_mutually_exclusive(self):
        setting = make_attendance_penalty_setting(
            "branch-a", "night", 1_000, 75_000, "2026-01-01T00:00:00Z", "att-v1"
        )
        ready = "2026-08-18T20:00:00+08:00"
        on_time = calculate_attendance_penalty(
            setting, "shift-1", ready, "2026-08-18T19:59:00+08:00"
        )
        self.assertEqual(Decimal("0"), on_time["totalMonetaryPenalty"])
        self.assertEqual([], on_time["settlementLineItems"])

        late = calculate_attendance_penalty(
            setting, "shift-2", ready, "2026-08-18T20:15:00+08:00"
        )
        self.assertEqual(Decimal("15"), late["latenessMinutes"])
        self.assertEqual(Decimal("15000"), late["latenessPenalty"])
        self.assertEqual(Decimal("0"), late["noShowPenalty"])
        self.assertEqual(["attendance_lateness"], [line["type"] for line in late["settlementLineItems"]])

        no_show = calculate_attendance_penalty(
            setting, "shift-3", ready, no_show=True
        )
        self.assertIsNone(no_show["latenessMinutes"])
        self.assertEqual(Decimal("0"), no_show["latenessPenalty"])
        self.assertEqual(Decimal("75000"), no_show["noShowPenalty"])
        self.assertEqual(Decimal("75000"), no_show["totalMonetaryPenalty"])
        self.assertEqual(["attendance_no_show"], [line["type"] for line in no_show["settlementLineItems"]])
        self.assertNotIn("ratePerMinute", no_show["settlementLineItems"][0])

    def test_attendance_settings_are_branch_specific_non_negative_and_non_retroactive(self):
        branch_a_v1 = make_attendance_penalty_setting(
            "branch-a", "night", 1_000, 50_000, "2026-01-01T00:00:00Z", "a-v1"
        )
        branch_a_v2 = make_attendance_penalty_setting(
            "branch-a", "night", 2_000, 90_000, "2026-08-01T00:00:00Z", "a-v2"
        )
        branch_b = make_attendance_penalty_setting(
            "branch-b", "night", 3_000, 120_000, "2026-01-01T00:00:00Z", "b-v1"
        )
        self.assertTrue(validate_attendance_penalty_setting(branch_a_v1, "branch-a"))
        self.assertTrue(validate_attendance_penalty_setting(branch_b, "branch-b"))
        self.assertNotEqual(
            branch_a_v1["amountPerMinuteLate"], branch_b["amountPerMinuteLate"]
        )
        with self.assertRaises(ValueError):
            validate_attendance_penalty_setting(branch_b, "branch-a")
        negative = make_attendance_penalty_setting(
            "branch-a", "night", -1, 10, "2026-01-01T00:00:00Z", "invalid"
        )
        with self.assertRaises(ValueError):
            validate_attendance_penalty_setting(negative)

        old_setting = select_effective_setting(
            [branch_a_v1, branch_a_v2],
            "branch-a",
            "2026-07-31T21:00:00Z",
            "night",
        )
        stored = calculate_attendance_penalty(
            old_setting,
            "shift-old",
            "2026-07-31T20:00:00+08:00",
            "2026-07-31T20:10:00+08:00",
        )
        self.assertEqual(Decimal("10000"), stored["totalMonetaryPenalty"])
        self.assertEqual("a-v1", stored["settingReference"]["version"])
        self.assertEqual(
            "a-v2",
            select_effective_setting(
                [branch_a_v1, branch_a_v2],
                "branch-a",
                "2026-08-18T21:00:00Z",
                "night",
            )["version"],
        )
        self.assertEqual(Decimal("10000"), stored["totalMonetaryPenalty"])

    def test_attendance_settlement_linkage_and_ranking_money_separation(self):
        setting = make_attendance_penalty_setting(
            "branch-a", "night", 1_500, 80_000, "2026-01-01T00:00:00Z", "att-v1"
        )
        result = calculate_attendance_penalty(
            setting,
            "scheduled-shift-1",
            "2026-08-18T20:00:00+08:00",
            "2026-08-18T20:05:00+08:00",
        )
        line = result["settlementLineItems"][0]
        self.assertEqual("scheduled-shift-1", line["sourceScheduledShiftId"])
        self.assertEqual("att-v1", line["settingReference"]["version"])
        self.assertEqual(Decimal("7500"), line["amount"])
        self.assertEqual(Decimal("-7500"), line["netSettlementImpact"])
        self.assertEqual(Decimal("5"), result["rankingInputs"]["latenessMinutes"])
        self.assertNotIn("amount", result["rankingInputs"])

    def test_internal_complaint_routes_only_to_ceo_and_relevant_managers(self):
        grants = {"manager-a": "branch-a", "manager-b": "branch-b"}
        message = create_internal_team_message(
            "complaint", "employee-1", "ent-1", "branch-a", "What happened and why", grants
        )
        recipients = {item["recipientId"] for item in message["deliveryStates"]}
        self.assertEqual({"ceo-1", "manager-a"}, recipients)
        self.assertFalse(can_view_internal_message(message, "ent-1", "entertainer"))
        self.assertFalse(can_view_internal_message(message, "manager-b", "branch_manager", ["branch-b"]))
        self.assertTrue(can_view_internal_message(message, "manager-a", "branch_manager", ["branch-a"]))
        self.assertTrue(can_view_internal_message(message, "ceo-1", "ceo"))
        self.assertFalse(message["routing"]["subjectCanRespond"])
        self.assertIsNone(message["senderConfirmation"]["managementReviewData"])

    def test_internal_compliment_delivers_to_praised_employee_and_management(self):
        message = create_internal_team_message(
            "compliment",
            "ent-2",
            "employee-1",
            "branch-a",
            "Excellent teamwork",
            {"manager-a": "branch-a"},
        )
        audiences = {item["audienceType"] for item in message["deliveryStates"]}
        self.assertEqual(
            {"ceo", "authorized_branch_manager", "compliment_recipient"}, audiences
        )
        self.assertTrue(can_view_internal_message(message, "employee-1", "employee"))
        self.assertEqual("internal_team", message["sourceType"])
        self.assertFalse(message["routing"]["automaticRankingImpact"])
        self.assertEqual({}, message["rankingChanges"])

    def test_internal_complaint_is_only_potential_attitude_evidence(self):
        attitude_rule = self.components["entertainer_attitude"]["internalTeamComplaintRule"]
        self.assertFalse(attitude_rule["automaticScoreImpact"])
        self.assertEqual(
            "none_internal_employee_complaints_are_separate",
            attitude_rule["customerComplaintsFactorImpact"],
        )
        self.assertIn(
            "branch_manager_deliberately_links",
            attitude_rule["requiredTransition"],
        )
        routing_rules = " ".join(self.internal_message_schema["x-routing-rules"])
        self.assertIn("complaint subject receives no delivery", routing_rules)

    def test_customer_message_requires_identified_customer_room_and_experience(self):
        base = dict(
            message_type="complaint",
            customer_id="customer-1",
            vip_room_id="room-7",
            experience_context={"visitId": "visit-1"},
            selected_entertainer_id="ent-1",
            validated_branch_id="branch-a",
            text="Experience details",
            manager_branch_grants={"manager-a": "branch-a"},
        )
        for field, invalid_value in (
            ("customer_id", ""),
            ("vip_room_id", ""),
            ("experience_context", {}),
        ):
            invalid = base | {field: invalid_value}
            with self.subTest(field=field), self.assertRaises(ValueError):
                create_customer_message(**invalid)
        required = set(self.customer_message_schema["required"])
        self.assertTrue({"customerId", "vipRoomId", "experienceContext"}.issubset(required))

    def test_customer_complaint_privacy_branch_routing_and_no_score_impact(self):
        message = create_customer_message(
            "complaint",
            "customer-1",
            "room-7",
            {"reservationId": "reservation-1"},
            "ent-1",
            "branch-a",
            "Complaint details",
            {"manager-a": "branch-a", "manager-b": "branch-b"},
        )
        recipients = {item["recipientId"] for item in message["deliveryStates"]}
        self.assertEqual({"ceo-1", "manager-a"}, recipients)
        self.assertFalse(can_view_customer_message(message, "ent-1", "entertainer"))
        self.assertFalse(can_view_customer_message(message, "manager-b", "branch_manager", ["branch-b"]))
        self.assertTrue(can_view_customer_message(message, "manager-a", "branch_manager", ["branch-a"]))
        self.assertFalse(message["routing"]["automaticRankingImpact"])
        self.assertEqual({}, message["rankingChanges"])
        evidence_rule = self.components["customer_complaints"]["customerPortalEvidenceRule"]
        self.assertFalse(evidence_rule["anonymousSubmissionAllowed"])
        self.assertFalse(evidence_rule["automaticScoreImpact"])
        self.assertEqual(
            "approved_verification_review_and_versioned_normalization_rule",
            evidence_rule["eligibilityTransition"],
        )

    def test_customer_praise_delivers_to_entertainer_and_management_with_field_policy(self):
        message = create_customer_message(
            "praise",
            "customer-1",
            "room-7",
            {"sessionId": "session-1", "visitId": "visit-1"},
            "ent-1",
            "branch-a",
            "Wonderful experience",
            {"manager-a": "branch-a"},
        )
        audiences = {item["audienceType"] for item in message["deliveryStates"]}
        self.assertEqual(
            {"ceo", "authorized_branch_manager", "praised_entertainer"}, audiences
        )
        self.assertTrue(can_view_customer_message(message, "ent-1", "entertainer"))
        self.assertEqual(
            "field_level_policy_required",
            message["routing"]["entertainerCustomerContextPolicy"],
        )
        self.assertFalse(message["routing"]["automaticRankingImpact"])

    def test_customer_and_employee_sources_remain_distinguishable(self):
        internal = create_internal_team_message(
            "complaint", "employee-1", "ent-1", "branch-a", "Internal issue", {}
        )
        customer = create_customer_message(
            "complaint",
            "customer-1",
            "room-7",
            {"visitId": "visit-1"},
            "ent-1",
            "branch-a",
            "Customer experience",
            {},
        )
        self.assertEqual("internal_team", internal["sourceType"])
        self.assertEqual("customer_portal", customer["sourceType"])
        self.assertIn("sourceType", self.internal_message_schema["required"])
        self.assertEqual(
            "internal_team",
            self.internal_message_schema["properties"]["sourceType"]["const"],
        )
        self.assertEqual(
            "customer_portal",
            self.customer_message_schema["properties"]["sourceType"]["const"],
        )
        self.assertNotIn("customerId", internal)
        self.assertEqual("customer-1", customer["customerId"])


if __name__ == "__main__":
    unittest.main()
