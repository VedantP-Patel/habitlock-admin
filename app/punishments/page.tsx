import { Card } from '@/components/ui'

export default function PunishmentsPage() {
  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Punishments</h1>
          <p className="page-subtitle">Manage how your apps are blocked.</p>
        </div>
      </div>

      <Card>
        <h3>Anti-Cheat Notice</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          By default, HabitLock automatically blocks apps based on your App Rules when habits are incomplete.
          In a future update, you will be able to customize specific punishment types (e.g. donating money, sending a tweet, or locking the device completely).
        </p>
      </Card>
    </div>
  )
}
