import { ArrowLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="page not-found">
      <SearchX size={36} strokeWidth={1.5} aria-hidden="true" />
      <h1>Дэлгэц олдсонгүй</h1>
      <p>Хаяг өөрчлөгдсөн эсвэл энэ role-д харагдахгүй байж болно.</p>
      <Link className="button button--primary" to="/"><ArrowLeft size={18} aria-hidden="true" />Удирдлагын төв рүү</Link>
    </div>
  )
}
