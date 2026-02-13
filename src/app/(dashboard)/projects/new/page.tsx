import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NewProjectForm } from './new-project-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: defaultClientId } = await searchParams;
  const supabase = await createClient();
  const { data: clients } = await supabase.from('clients').select('id, name').order('name');
  const clientOptions = (clients ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects" aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
          <p className="text-muted-foreground mt-1">Create a project and link it to a client.</p>
        </div>
      </div>

      <div className="glass-card p-6 max-w-xl">
        {clientOptions.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add your first client to start creating projects.
            </p>
            <Button asChild>
              <Link href="/clients">Add client</Link>
            </Button>
          </div>
        ) : (
          <NewProjectForm clientOptions={clientOptions} defaultClientId={defaultClientId ?? ''} />
        )}
      </div>
    </div>
  );
}
