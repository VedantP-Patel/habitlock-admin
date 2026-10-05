import { Card } from '@/components/ui'

export default function SettingsPage() {
  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences.</p>
        </div>
      </div>

      <Card>
        <h3>Account settings</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          To change your email or password, or to request a full account deletion, please use the Android app.
        </p>
      </Card>
    </div>
  )
}
