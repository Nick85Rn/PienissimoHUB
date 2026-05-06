import { useParams, Link } from 'react-router-dom'
import { TaskForm } from '@/components/TaskForm'
import { PageLoader } from '@/components/Spinner'
import { useTask } from '@/hooks/useTasks'

export default function EditTask() {
  const { id } = useParams<{ id: string }>()
  const { data: task, isLoading, error } = useTask(id)

  if (isLoading) return <PageLoader />

  if (error || !task) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Task non trovato
        </h2>
        <p className="text-slate-500 mb-6">
          Il task richiesto non esiste o è stato eliminato.
        </p>
        <Link
          to="/dashboard"
          className="text-pienissimo-blue hover:underline font-medium"
        >
          Torna alla Dashboard
        </Link>
      </div>
    )
  }

  return <TaskForm mode="edit" initial={task} />
}
