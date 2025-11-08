import { supabase } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';

export type Stage = { id: string; name: string; order: number };
export type ProjectTask = {
  id: string;
  name: string;
  stage_id: string;
  complete: boolean;
  order_num: number;
};

export function useProjectTasks(
  projectId?: string,
  projectStageId?: string,
  stages: Stage[] = []
) {
  const [prevTasks, setPrevTasks] = useState<ProjectTask[]>([]);
  const [currentTasks, setCurrentTasks] = useState<ProjectTask[]>([]);
  const [nextTasks, setNextTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);

  const currentStage = useMemo(
    () => stages.find((s) => s.id === projectStageId) || null,
    [stages, projectStageId]
  );
  const prevStage = useMemo(
    () =>
      currentStage
        ? stages.find((s) => s.order === currentStage.order - 1) || null
        : null,
    [stages, currentStage]
  );
  const nextStage = useMemo(
    () =>
      currentStage
        ? stages.find((s) => s.order === currentStage.order + 1) || null
        : null,
    [stages, currentStage]
  );

  useEffect(() => {
    if (!projectId || !currentStage) return;

    const load = async () => {
      setLoading(true);

      // Get all prior stage IDs (stages with order < current stage order)
      const priorStageIds = stages
        .filter((s) => s.order < currentStage.order)
        .map((s) => s.id);

      // Query with LEFT JOIN to get completion status per project
      const buildQuery = (stageIds: string[]) => `
        project_tasks.id,
        project_tasks.name,
        project_tasks.stage_id,
        project_tasks.order_num,
        COALESCE(project_task_completion.complete, false) as complete
      `;

      const [{ data: current }, { data: allPrior }, { data: next }] =
        await Promise.all([
          supabase
            .from('project_tasks')
            .select(
              `
              id,
              name,
              stage_id,
              order_num,
              project_task_completion!left(
                complete,
                project_id
              )
            `
            )
            .eq('stage_id', currentStage.id)
            .order('order_num', { ascending: true }),
          priorStageIds.length > 0
            ? supabase
                .from('project_tasks')
                .select(
                  `
                  id,
                  name,
                  stage_id,
                  order_num,
                  project_task_completion!left(
                    complete,
                    project_id
                  )
                `
                )
                .in('stage_id', priorStageIds)
                .order('order_num', { ascending: true })
            : Promise.resolve({ data: [] as ProjectTask[] } as any),
          nextStage
            ? supabase
                .from('project_tasks')
                .select(
                  `
                  id,
                  name,
                  stage_id,
                  order_num,
                  project_task_completion!left(
                    complete,
                    project_id
                  )
                `
                )
                .eq('stage_id', nextStage.id)
                .order('order_num', { ascending: true })
            : Promise.resolve({ data: [] as ProjectTask[] } as any),
        ]);

      // Map the results to flatten the completion data
      const mapTasks = (data: any[]): ProjectTask[] => {
        return (data ?? []).map((task: any) => {
          // Find completion record for THIS project
          const completion = Array.isArray(task.project_task_completion)
            ? task.project_task_completion.find(
                (c: any) => c.project_id === projectId
              )
            : task.project_task_completion?.project_id === projectId
              ? task.project_task_completion
              : null;

          return {
            id: task.id,
            name: task.name,
            stage_id: task.stage_id,
            order_num: task.order_num,
            complete: completion?.complete ?? false,
          };
        });
      };

      setCurrentTasks(mapTasks(current ?? []));
      setPrevTasks(mapTasks(allPrior ?? []));
      setNextTasks(mapTasks(next ?? []));
      setLoading(false);
    };

    load();
  }, [projectId, currentStage?.id, stages, nextStage?.id]);

  const reload = async () => {
    if (!projectId || !currentStage) return;

    setLoading(true);

    // Get all prior stage IDs (stages with order < current stage order)
    const priorStageIds = stages
      .filter((s) => s.order < currentStage.order)
      .map((s) => s.id);

    const [{ data: current }, { data: allPrior }, { data: next }] =
      await Promise.all([
        supabase
          .from('project_tasks')
          .select(
            `
            id,
            name,
            stage_id,
            order_num,
            project_task_completion!left(
              complete,
              project_id
            )
          `
          )
          .eq('stage_id', currentStage.id)
          .order('order_num', { ascending: true }),
        priorStageIds.length > 0
          ? supabase
              .from('project_tasks')
              .select(
                `
                id,
                name,
                stage_id,
                order_num,
                project_task_completion!left(
                  complete,
                  project_id
                )
              `
              )
              .in('stage_id', priorStageIds)
              .order('order_num', { ascending: true })
          : Promise.resolve({ data: [] as ProjectTask[] } as any),
        nextStage
          ? supabase
              .from('project_tasks')
              .select(
                `
                id,
                name,
                stage_id,
                order_num,
                project_task_completion!left(
                  complete,
                  project_id
                )
              `
              )
              .eq('stage_id', nextStage.id)
              .order('order_num', { ascending: true })
          : Promise.resolve({ data: [] as ProjectTask[] } as any),
      ]);

    // Map the results to flatten the completion data
    const mapTasks = (data: any[]): ProjectTask[] => {
      return (data ?? []).map((task: any) => {
        // Find completion record for THIS project
        const completion = Array.isArray(task.project_task_completion)
          ? task.project_task_completion.find(
              (c: any) => c.project_id === projectId
            )
          : task.project_task_completion?.project_id === projectId
            ? task.project_task_completion
            : null;

        return {
          id: task.id,
          name: task.name,
          stage_id: task.stage_id,
          order_num: task.order_num,
          complete: completion?.complete ?? false,
        };
      });
    };

    setCurrentTasks(mapTasks(current ?? []));
    setPrevTasks(mapTasks(allPrior ?? []));
    setNextTasks(mapTasks(next ?? []));
    setLoading(false);
  };

  const toggleTask = async (taskId: string, complete: boolean) => {
    if (!projectId) return { error: new Error('No project ID') };

    // Check if completion record exists
    const { data: existing } = await supabase
      .from('project_task_completion')
      .select('id')
      .eq('project_id', projectId)
      .eq('task_id', taskId)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing record
      const result = await supabase
        .from('project_task_completion')
        .update({ complete: !complete })
        .eq('id', existing.id);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase.from('project_task_completion').insert({
        project_id: projectId,
        task_id: taskId,
        complete: !complete,
      });
      error = result.error;
    }

    if (!error) {
      setCurrentTasks((ts) => {
        const updated = ts.map((t) =>
          t.id === taskId ? { ...t, complete: !complete } : t
        );
        console.log('toggleTask updating currentTasks:', updated);
        return updated;
      });
    }
    return { error };
  };

  return {
    prevStage,
    nextStage,
    prevTasks,
    currentTasks,
    nextTasks,
    toggleTask,
    reload,
    loading,
  };
}
