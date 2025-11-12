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

      const [{ data: current }, { data: allPrior }, { data: next }] =
        await Promise.all([
          supabase
            .from('engagement_tasks')
            .select(
              `
              id,
              name,
              stage_id,
              order_num,
              engagement_task_completion!left(
                complete,
                engagement_id
              )
            `
            )
            .eq('stage_id', currentStage.id)
            .order('order_num', { ascending: true }),
          priorStageIds.length > 0
            ? supabase
                .from('engagement_tasks')
                .select(
                  `
                  id,
                  name,
                  stage_id,
                  order_num,
                  engagement_task_completion!left(
                    complete,
                    engagement_id
                  )
                `
                )
                .in('stage_id', priorStageIds)
                .order('order_num', { ascending: true })
            : Promise.resolve({ data: [] as never[] }),
          nextStage
            ? supabase
                .from('engagement_tasks')
                .select(
                  `
                  id,
                  name,
                  stage_id,
                  order_num,
                  engagement_task_completion!left(
                    complete,
                    engagement_id
                  )
                `
                )
                .eq('stage_id', nextStage.id)
                .order('order_num', { ascending: true })
            : Promise.resolve({ data: [] as never[] }),
        ]);

      // Map the results to flatten the completion data
      type RawTask = {
        id: string;
        name: string;
        stage_id: string;
        order_num: number;
        engagement_task_completion?:
          | { complete: boolean; engagement_id: string }[]
          | { complete: boolean; engagement_id: string }
          | null;
      };
      const mapTasks = (data: RawTask[] | null | undefined): ProjectTask[] => {
        return (data ?? []).map((task: RawTask) => {
          const completion = Array.isArray(task.engagement_task_completion)
            ? task.engagement_task_completion.find(
                (c) => c.engagement_id === projectId
              )
            : task.engagement_task_completion &&
                'engagement_id' in task.engagement_task_completion &&
                task.engagement_task_completion.engagement_id === projectId
              ? task.engagement_task_completion
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentStage?.id]);

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
          .from('engagement_tasks')
          .select(
            `
            id,
            name,
            stage_id,
            order_num,
            engagement_task_completion!left(
              complete,
              engagement_id
            )
          `
          )
          .eq('stage_id', currentStage.id)
          .order('order_num', { ascending: true }),
        priorStageIds.length > 0
          ? supabase
              .from('engagement_tasks')
              .select(
                `
                id,
                name,
                stage_id,
                order_num,
                engagement_task_completion!left(
                  complete,
                  engagement_id
                )
              `
              )
              .in('stage_id', priorStageIds)
              .order('order_num', { ascending: true })
          : Promise.resolve({ data: [] as never[] }),
        nextStage
          ? supabase
              .from('engagement_tasks')
              .select(
                `
                id,
                name,
                stage_id,
                order_num,
                engagement_task_completion!left(
                  complete,
                  engagement_id
                )
              `
              )
              .eq('stage_id', nextStage.id)
              .order('order_num', { ascending: true })
          : Promise.resolve({ data: [] as never[] }),
      ]);

    // Map the results to flatten the completion data
    type RawTask2 = {
      id: string;
      name: string;
      stage_id: string;
      order_num: number;
      engagement_task_completion?:
        | { complete: boolean; project_id?: string; engagement_id?: string }[]
        | { complete: boolean; project_id?: string; engagement_id?: string }
        | null;
    };
    const mapTasks = (data: RawTask2[] | null | undefined): ProjectTask[] => {
      return (data ?? []).map((task: RawTask2) => {
        const completion = Array.isArray(task.engagement_task_completion)
          ? task.engagement_task_completion.find(
              (c) => c.project_id === projectId || c.engagement_id === projectId
            )
          : task.engagement_task_completion &&
              ((
                task.engagement_task_completion as {
                  project_id?: string;
                  engagement_id?: string;
                }
              ).project_id === projectId ||
                (
                  task.engagement_task_completion as {
                    project_id?: string;
                    engagement_id?: string;
                  }
                ).engagement_id === projectId)
            ? (task.engagement_task_completion as { complete: boolean })
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
      .from('engagement_task_completion')
      .select('id')
      .eq('engagement_id', projectId)
      .eq('task_id', taskId)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing record
      const result = await supabase
        .from('engagement_task_completion')
        .update({ complete: !complete })
        .eq('id', existing.id);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase.from('engagement_task_completion').insert({
        engagement_id: projectId,
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
