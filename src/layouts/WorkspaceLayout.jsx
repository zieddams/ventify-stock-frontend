import { useAuth } from '../contexts/AuthContext'
import WebActivityTracker from '../components/WebActivityTracker'
import AppLayout from './AppLayout'
import DeveloperWorkspaceLayout from './DeveloperWorkspaceLayout'

export default function WorkspaceLayout() {
  const { isDeveloperWorkspace } = useAuth()

  return (
    <>
      <WebActivityTracker />
      {isDeveloperWorkspace() ? <DeveloperWorkspaceLayout /> : <AppLayout />}
    </>
  )
}
