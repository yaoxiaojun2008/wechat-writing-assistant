import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainWorkspace } from '@/components/MainWorkspace';

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainWorkspace />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;