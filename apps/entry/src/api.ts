export type AppContext={user:string;full_name:string;branch:string;branches?:string[];mode:'guard'|'manager'|'operation'|'admin';entry_access_required?:boolean;entry_access_test_bypass?:boolean}
export type BranchProfile={branch:string;membership_rank:string;manual_rank?:string|null;rank_override_by?:string|null;rank_override_at?:string|null;service_characteristics?:string|null;service_characteristics_updated_by?:string|null;service_characteristics_updated_at?:string|null;is_banned:number;ban_reason?:string|null;banned_by?:string|null;banned_at?:string|null;visit_count:number;bill_count:number;total_spend:number;average_bill:number;last_visit:string|null}
export type BranchBanNotice={branch:string;ban_reason?:string|null;banned_by?:string|null;banned_at?:string|null}
export type DancerPreference={dancer_id:string;name:string;nickname:string;bill_count:number;service_count:number;service_hours:number;service_spend:number;last_visit:string|null}
export type ServicePreference={menu_id:string;name:string;quantity:number;total_spend:number;bill_count:number}
export type BillDancer={name:string;nickname:string;hours:number}
export type BillItem={name:string;quantity:number;total:number;is_paid_service:number;is_room:boolean;is_hour_service:boolean;dancers:BillDancer[]}
export type RecentBill={name:string;bill_code:string;posting_date:string;open_date:string|null;closed_date:string|null;duration_minutes:number;store_name:string;total_amount:number;bill_type:number;is_paid:number;rooms:{name:string;hours:number}[];items:BillItem[]}
export type PhoneReservation={name:string;customer?:string;customer_name:string;phone:string;expected_at:string;party_size:number;order_details?:string;order_items?:string[];notes?:string;status:'Scheduled'|'Arrived'|'Cancelled';arrived_at?:string|null;entry_event?:string|null;is_banned?:number;ban_reason?:string|null;banned_by?:string|null;banned_at?:string|null}
export type DailyGuestItem=PhoneReservation&{kind:'reservation'|'direct';actual_at?:string|null;membership_rank?:string;visit_number?:number}
export type DailyEntryWorkspace={branch:string;work_date:string;window_start:string;window_end:string;is_current:boolean;summary:{waiting:number;arrived:number;cancelled:number};items:DailyGuestItem[];reservations?:DailyGuestItem[]}

type DailyEntryWorkspacePayload=Partial<Omit<DailyEntryWorkspace,'summary'|'items'|'reservations'>>&{
  summary?:Partial<DailyEntryWorkspace['summary']>|null
  items?:DailyGuestItem[]|null
  reservations?:DailyGuestItem[]|null
}

export function normalizeDailyEntryWorkspace(value:DailyEntryWorkspacePayload|null|undefined):DailyEntryWorkspace{
  const items=Array.isArray(value?.items)
    ? value.items
    : Array.isArray(value?.reservations)
      ? value.reservations
      : []
  const summary=value?.summary
  return {
    branch:value?.branch||'',
    work_date:value?.work_date||'',
    window_start:value?.window_start||'',
    window_end:value?.window_end||'',
    is_current:value?.is_current!==false,
    summary:{
      waiting:Number.isFinite(summary?.waiting)?Number(summary?.waiting):items.filter(item=>item.status==='Scheduled').length,
      arrived:Number.isFinite(summary?.arrived)?Number(summary?.arrived):items.filter(item=>item.status==='Arrived').length,
      cancelled:Number.isFinite(summary?.cancelled)?Number(summary?.cancelled):items.filter(item=>item.status==='Cancelled').length,
    },
    items,
    reservations:Array.isArray(value?.reservations)?value.reservations:undefined,
  }
}
export type PointTransaction={name:string;transaction_type:'Earn'|'Earn Adjustment'|'Redeem'|'Reversal';points:number;branch:string;membership_rank:string;cashback_percent:number;vip_pos_bill?:string|null;bill_code?:string|null;redemption_category?:'Tax'|'VIP Room'|null;posted_by:string;posted_at:string;note?:string|null}
export type PointComponentOption={name:string;quantity:number;unit_price:number;total:number}
export type PointEligibleBill={name:string;bill_code:string;posting_date:string;store_name:string;is_paid?:number;eligible:{Tax:number;'VIP Room':number};remaining:{Tax:number;'VIP Room':number};options?:{Tax:PointComponentOption[];'VIP Room':PointComponentOption[]}}
export type CustomerWallet={balance:number;earned_total:number;redeemed_total:number;cashback_rate:number;rank:string;rates:Record<string,number>;transactions:PointTransaction[];eligible_bills:PointEligibleBill[]}
export type CustomerDetail={
  customer:{name:string;customer_name:string;phone:string;visit_count:number;bill_count:number;total_spend:number;average_bill:number;first_visit:string|null;last_visit:string|null;primary_branch:string|null}
  scope_branch:string
  branch_profiles:BranchProfile[]
  branch_ban_notices?:BranchBanNotice[]
  dancers:DancerPreference[]
  services:ServicePreference[]
  recent_bills:RecentBill[]
  next_visit_number:number
  reservations:PhoneReservation[]
  wallet?:CustomerWallet
}
export type Entry={name:string;customer:string;customer_name:string;membership_rank:string;guard_user:string;guard_name:string;entered_at:string;visit_type:string;visit_number:number;reservation?:string|null;manager_acknowledged:number}
export type ServiceEntry={name:string;customer_name:string;membership_rank:string;entered_at:string;visit_number:number;service_characteristics:string}
export type ServiceEntryFeed={branch:string;work_date:string;window_start:string;window_end:string;entries:ServiceEntry[];today_total:number;visible_fields:string[]}
export type EntrySummary={
  entry:{name:string;customer:string;customer_name:string;entered_at:string;visit_number:number;guard_name:string}
  phone:string
  visit_count:number
  membership_rank:string
  average_bill:number
  latest_bill:RecentBill|null
  reservation:PhoneReservation|null
  entertainers:{dancer_id:string;name:string;nickname:string;service_count:number;bill_count:number}[]
  top_entertainer:{dancer_id:string;name:string;nickname:string;service_count:number;bill_count:number}|null
}
export type CustomerRankRule={name:string;branch:string;membership_rank:'Bronze'|'Silver'|'Gold'|'Diamond'|'Black Diamond';rank_order:number;minimum_total_spend:number;minimum_visit_count:number;minimum_average_bill:number;active:number;modified:string;applied_at?:string|null}
export type MembershipPolicy={name:string;branch:string;version:string;status:'Active';effective_from:string;effective_to?:string|null;lookback_visit_count:number;currency:string;decision_role:string;sla_hours:number;modified:string;tiers:Array<CustomerRankRule&{maximum_average_bill?:number|null}>}
export type RankSettings={branches:string[];branch:string;policy:MembershipPolicy|null;policy_state:'active'|'configuration_required';rules:CustomerRankRule[];rules_are_reference_only:boolean;stats:{total_customers:number;ranked_customers:number;unranked_customers:number;last_applied_at:string|null}}
export type RankRecalculation={branch:string;processed:number;changed:number;counts:Record<string,number>;applied_at:string;stats:RankSettings['stats']}
export type AdminCustomer={name:string;customer:string;customer_name:string;phone:string;membership_rank:string;manual_rank?:string|null;rank_override_by?:string|null;visit_count:number;bill_count:number;total_spend:number;average_bill:number;last_visit:string|null}
export type BranchCustomers={branch:string;customers:AdminCustomer[];total:number;limit_start:number;limit_page_length:number;rank_counts:Record<string,number>}
export type BranchAttendanceQR={branch:string;qr_payload:string;entry_qr_payload:string;configured:boolean;latitude:number|null;longitude:number|null;radius_meters:number;active:boolean;configured_at:string|null}
export type EntryAccessVerification={branch:string;verified_at:string;distance_meters:number;radius_meters:number}
export type EntryQRContext={branch:string}

type EntryAccessEvidence={token:string;latitude:number;longitude:number;accuracy:number}
let entryAccessEvidence:EntryAccessEvidence|null=null
export function setEntryAccessEvidence(value:EntryAccessEvidence|null){entryAccessEvidence=value}

async function request<T>(method:string,args:Record<string,unknown>={},httpMethod:'GET'|'POST'='GET'):Promise<T>{
  const apiPrefix=window.location.pathname.startsWith('/vip-entry')?'/vip-entry-api':'/api'
  const url=new URL(`${apiPrefix}/method/${method}`,window.location.origin)
  const options:RequestInit={method:httpMethod,credentials:'include',headers:{},cache:'no-store'}
  const accessArgs=entryAccessEvidence&&!method.endsWith('verify_branch_entry_access')?{
    entry_access_token:entryAccessEvidence.token,
    entry_access_latitude:entryAccessEvidence.latitude,
    entry_access_longitude:entryAccessEvidence.longitude,
    entry_access_accuracy:entryAccessEvidence.accuracy,
  }:{}
  const finalArgs={...args,...accessArgs}
  if(httpMethod==='GET') {
    Object.entries(finalArgs).forEach(([key,value])=>url.searchParams.set(key,String(value)))
    url.searchParams.set('_ts',String(Date.now()))
  }
  else {options.headers={'Content-Type':'application/x-www-form-urlencoded'};options.body=new URLSearchParams(Object.entries(finalArgs).map(([k,v])=>[k,String(v)]))}
  const response=await fetch(url,options)
  const payload=await response.json().catch(()=>({}))
  if(!response.ok||payload.exc) throw new Error(payload.message||payload.exception||'Хүсэлт амжилтгүй боллоо')
  return payload.message as T
}
export const api={
  login:(usr:string,pwd:string)=>request('login',{usr,pwd},'POST'),
  logout:()=>request('logout',{},'POST'),
  context:()=>request<AppContext>('nomad_vip.api.entry.get_context'),
  search:(phone:string)=>request<{found:boolean;detail?:CustomerDetail}>('nomad_vip.api.entry.search_customer',{phone}),
  managerCustomerSearch:(phone:string)=>request<{found:boolean;branch:string;phone:string;detail?:CustomerDetail}>('nomad_vip.api.entry.search_customer_for_manager',{phone}),
  register:(customer_name:string,phone:string)=>request<{created:boolean;detail:CustomerDetail}>('nomad_vip.api.customer.register_walk_in_customer',{customer_name,phone},'POST'),
  admit:(customer:string,reservation?:string)=>request<Entry>('nomad_vip.api.entry.admit_customer',reservation?{customer,reservation}:{customer},'POST'),
  guardWaitlist:async(work_date?:string)=>normalizeDailyEntryWorkspace(await request<DailyEntryWorkspacePayload>('nomad_vip.api.operation.get_guard_waitlist',work_date?{work_date}:{})),
  dailyEntryWorkspace:async(branch:string,work_date?:string)=>normalizeDailyEntryWorkspace(await request<DailyEntryWorkspacePayload>('nomad_vip.api.operation.get_daily_entry_workspace',work_date?{branch,work_date}:{branch})),
  serviceEntryFeed:(branch:string)=>request<ServiceEntryFeed>('nomad_vip.api.entry.get_service_entry_feed',{branch,limit:50}),
  feed:()=>request<{branch:string;work_date:string;window_start:string;window_end:string;entries:Entry[];pending_reservations:PhoneReservation[];today_total:number;today_new:number;unread:number}>('nomad_vip.api.entry.get_feed'),
  entrySummary:(entry:string)=>request<EntrySummary>('nomad_vip.api.entry.get_entry_summary',{entry}),
  customerDetail:(customer:string)=>request<CustomerDetail>('nomad_vip.api.entry.get_customer_detail_for_entry',{customer}),
  setCustomerRank:(customer:string,membership_rank:string)=>request<CustomerDetail>('nomad_vip.api.entry.set_customer_rank_for_entry',{customer,membership_rank},'POST'),
  setCustomerBan:(customer:string,banned:boolean,reason:string)=>request<CustomerDetail>('nomad_vip.api.entry.set_customer_ban_for_entry',{customer,banned:banned?1:0,reason},'POST'),
  redeemCustomerPoints:(customer:string,vip_pos_bill:string,category:'Tax'|'VIP Room',points:number,note:string,manager_unavailable_reason='')=>request<CustomerDetail>('nomad_vip.api.cashback.redeem_customer_points',{customer,vip_pos_bill,category,points,note,manager_unavailable_reason},'POST'),
  acknowledge:(entry:string)=>request('nomad_vip.api.entry.acknowledge_entry',{entry},'POST'),
  createPhoneReservation:(values:{customer_name:string;phone:string;party_size:number;branch:string;expected_at:string;notes?:string})=>request<PhoneReservation>('nomad_vip.api.operation.create_phone_reservation',values,'POST'),
  phoneReservations:async(branch:string,work_date?:string)=>normalizeDailyEntryWorkspace(await request<DailyEntryWorkspacePayload>('nomad_vip.api.operation.get_phone_reservations',work_date?{branch,work_date}:{branch})),
  cancelPhoneReservation:(reservation:string)=>request('nomad_vip.api.operation.cancel_phone_reservation',{reservation},'POST'),
  rankSettings:(branch?:string)=>request<RankSettings>('nomad_vip.api.membership_admin.get_membership_policy_settings',branch?{branch}:{}),
  branchCustomers:(branch:string,membership_rank:string,search:string,limit_start:number)=>request<BranchCustomers>('nomad_vip.api.admin.get_branch_customers',{branch,membership_rank,search,limit_start,limit_page_length:50}),
  branchAttendanceQR:(branch:string)=>request<BranchAttendanceQR>('nomad_vip.api.attendance.get_branch_qr',{branch}),
  configureBranchLocation:(branch:string,latitude:number,longitude:number,radius_meters:number)=>request<BranchAttendanceQR>('nomad_vip.api.attendance.configure_branch_location',{branch,latitude,longitude,radius_meters},'POST'),
  entryQRContext:(qr_payload:string)=>request<EntryQRContext>('nomad_vip.api.entry_access.get_entry_qr_context',{qr_payload}),
  verifyEntryAccess:(qr_payload:string,latitude:number,longitude:number,accuracy:number)=>request<EntryAccessVerification>('nomad_vip.api.entry_access.verify_branch_entry_access',{qr_payload,latitude,longitude,accuracy},'POST'),
}
