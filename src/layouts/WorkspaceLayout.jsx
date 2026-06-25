import { useAuth } from '../contexts/AuthContext'
import AppLayout from './AppLayout'
import DeveloperWorkspaceLayout from './DeveloperWorkspaceLayout'

export default function WorkspaceLayout() {
  const { isDeveloperWorkspace } = useAuth()

  return isDeveloperWorkspace() ? <DeveloperWorkspaceLayout /> : <AppLayout />
}
