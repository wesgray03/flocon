// components/project/ChangeOrdersModule.tsx
// Wrapper component for ChangeOrdersSection - can be embedded or standalone
import ChangeOrdersSection from './ChangeOrdersSection';

export default function ChangeOrdersModule({
  projectId,
  variant = 'embedded',
}: {
  projectId: string;
  variant?: 'embedded' | 'standalone';
}) {
  return <ChangeOrdersSection projectId={projectId} />;
}
