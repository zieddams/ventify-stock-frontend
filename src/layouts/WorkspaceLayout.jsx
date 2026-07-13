import { useAuth } from '../contexts/AuthContext'
import WebActivityTracker from '../components/WebActivityTracker'
import AppLayout from './AppLayout'
import DeveloperWorkspaceLayout from './DeveloperWorkspaceLayout'
import PosWorkspaceLayout from './PosWorkspaceLayout'

export default function WorkspaceLayout() {
  const { isDeveloperWorkspace, isPosWorkspace } = useAuth()

  return (
    <>
      <WebActivityTracker />
      {isDeveloperWorkspace() ? <DeveloperWorkspaceLayout /> : isPosWorkspace() ? <PosWorkspaceLayout /> : <AppLayout />}
    </>
  )
}
