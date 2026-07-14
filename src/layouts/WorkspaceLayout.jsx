import { useAuth } from '../contexts/AuthContext'
import WebActivityTracker from '../components/WebActivityTracker'
import AppLayout from './AppLayout'
import DeveloperWorkspaceLayout from './DeveloperWorkspaceLayout'
import PosWorkspaceLayout from './PosWorkspaceLayout'
import SupervisorWorkspaceLayout from './SupervisorWorkspaceLayout'

export default function WorkspaceLayout() {
  const { isDeveloperWorkspace, isPosWorkspace, isSupervisor } = useAuth()

  return (
    <>
      <WebActivityTracker />
      {isDeveloperWorkspace() ? <DeveloperWorkspaceLayout />
        : isPosWorkspace() ? <PosWorkspaceLayout />
        : isSupervisor() ? <SupervisorWorkspaceLayout />
        : <AppLayout />}
    </>
  )
}
