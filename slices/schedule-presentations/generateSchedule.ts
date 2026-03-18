export type Track = {
  roomName: string;
  presentation: string;
  presenter: string;
  attendees: string[];
};

export type Slot = {
  from: Date;
  until: Date;
  tracks: Track[];
};

export type Schedule = {
  slots: Slot[];
};

export type ExpoDayContext = {
  date: Date;
  rooms: string[];
  slotLengthInMin: number;
  slotStartingTimes: Date[];
};

export type ExpoContext = {
  days: ExpoDayContext[];
};

export type PresentationContext = {
  presentationId: string;
};

export type SchedulingContextModel = {
  expo: ExpoContext | null;
  attendeeIds: string[];
  presentations: PresentationContext[];
  presenterAssignments: Map<string, string[]>;
  attendeePreferences: Map<string, string[]>;
};

export type ScheduleGenerationResult =
  | {
      status: true;
      schedule: Schedule;
    }
  | {
      status: false;
      reason: string;
    };

type AtomicSlot = {
  roomName: string;
  from: Date;
  until: Date;
};

type AtomicTimeGroup = {
  from: Date;
  until: Date;
  rooms: string[];
};

type ScheduledTrackWithoutAttendees = {
  roomName: string;
  presentation: string;
  presenter: string;
};

type AssignedSlotWithoutAttendees = {
  from: Date;
  until: Date;
  tracks: ScheduledTrackWithoutAttendees[];
};

type MutableAssignedSlot = AssignedSlotWithoutAttendees & {
  rooms: string[];
};

export function generateSchedule(
  contextModel: SchedulingContextModel,
  randomNumberGenerator: () => number = Math.random,
): ScheduleGenerationResult {
  if (!contextModel.expo) {
    return {
      status: false,
      reason: "Es gibt keine Expo-Konfiguration fuer das Scheduling.",
    };
  }

  const timeGroups = groupAtomicSlotsByTime(
    createAtomicSlots(contextModel.expo.days),
  );

  if (timeGroups.length === 0) {
    return {
      status: false,
      reason: "Die Expo enthaelt keine verwendbaren Zeitslots.",
    };
  }

  const presenterPools = new Map<string, string[]>(
    contextModel.presentations.map((presentation) => [
      presentation.presentationId,
      shuffle(
        contextModel.presenterAssignments.get(presentation.presentationId) ?? [],
        randomNumberGenerator,
      ),
    ]),
  );
  const primaryAssignments = assignPrimaryPresentations(
    contextModel,
    timeGroups,
    presenterPools,
  );

  if (!primaryAssignments) {
    return {
      status: false,
      reason:
        "Die Praesentationen lassen sich nicht konfliktfrei auf die verfuegbaren Zeitslots verteilen.",
    };
  }

  assignRepeatsToUnusedTimes(contextModel, primaryAssignments, presenterPools);

  const assignedSlots = primaryAssignments
    .filter((assignment) => assignment.tracks.length > 0)
    .sort((left, right) => left.from.getTime() - right.from.getTime());
  const attendeeAssignmentResult = assignAttendeesToSlots(
    assignedSlots,
    contextModel,
  );

  if (!attendeeAssignmentResult) {
    return {
      status: false,
      reason:
        "Die Teilnehmerpraeferenzen koennen mit dem erzeugten Presentation-Scheduling nicht vollstaendig erfuellt werden.",
    };
  }

  return {
    status: true,
    schedule: {
      slots: attendeeAssignmentResult,
    },
  };
}

function assignPrimaryPresentations(
  contextModel: SchedulingContextModel,
  timeGroups: AtomicTimeGroup[],
  presenterPools: Map<string, string[]>,
): MutableAssignedSlot[] | null {
  const conflictGraph = buildPreferenceConflictGraph(
    contextModel.attendeePreferences,
  );
  const presentationDemand = buildPresentationDemand(
    contextModel.attendeePreferences,
  );
  const orderedPresentations = [...contextModel.presentations].sort(
    (left, right) => {
      const leftConflicts = conflictGraph.get(left.presentationId)?.size ?? 0;
      const rightConflicts = conflictGraph.get(right.presentationId)?.size ?? 0;

      if (leftConflicts !== rightConflicts) {
        return rightConflicts - leftConflicts;
      }

      const leftDemand = presentationDemand.get(left.presentationId) ?? 0;
      const rightDemand = presentationDemand.get(right.presentationId) ?? 0;

      if (leftDemand !== rightDemand) {
        return rightDemand - leftDemand;
      }

      return left.presentationId.localeCompare(right.presentationId);
    },
  );
  const mutableAssignments = timeGroups.map((timeGroup) => ({
    from: timeGroup.from,
    until: timeGroup.until,
    rooms: [...timeGroup.rooms],
    tracks: [] as ScheduledTrackWithoutAttendees[],
  }));

  for (const presentation of orderedPresentations) {
    const candidateSlots = mutableAssignments
      .filter((assignment) => assignment.tracks.length < assignment.rooms.length)
      .filter(
        (assignment) =>
          !assignment.tracks.some((track) =>
            conflictGraph.get(presentation.presentationId)?.has(track.presentation),
          ),
      )
      .filter(
        (assignment) =>
          findAvailablePresenter(
            presenterPools.get(presentation.presentationId) ?? [],
            assignment.tracks,
          ) !== null,
      )
      .sort((left, right) => {
        if (left.tracks.length !== right.tracks.length) {
          return left.tracks.length - right.tracks.length;
        }

        return left.from.getTime() - right.from.getTime();
      });
    const chosenSlot = candidateSlots[0];

    if (!chosenSlot) {
      return null;
    }

    const presenterPool = presenterPools.get(presentation.presentationId) ?? [];
    const presenter = findAvailablePresenter(presenterPool, chosenSlot.tracks);

    if (!presenter) {
      return null;
    }

    removeValue(presenterPool, presenter);
    chosenSlot.tracks.push({
      roomName: chosenSlot.rooms[chosenSlot.tracks.length] as string,
      presentation: presentation.presentationId,
      presenter,
    });
  }

  return mutableAssignments;
}

function assignRepeatsToUnusedTimes(
  contextModel: SchedulingContextModel,
  assignments: MutableAssignedSlot[],
  presenterPools: Map<string, string[]>,
) {
  const demand = buildPresentationDemand(contextModel.attendeePreferences);
  const repeatCandidates = [...contextModel.presentations].sort((left, right) => {
    const leftDemand = demand.get(left.presentationId) ?? 0;
    const rightDemand = demand.get(right.presentationId) ?? 0;

    if (leftDemand !== rightDemand) {
      return rightDemand - leftDemand;
    }

    return left.presentationId.localeCompare(right.presentationId);
  });
  const unusedSlots = assignments
    .filter((assignment) => assignment.tracks.length === 0)
    .sort((left, right) => left.from.getTime() - right.from.getTime());

  for (const assignment of unusedSlots) {
    const candidate = repeatCandidates.find((presentation) => {
      const presenterPool = presenterPools.get(presentation.presentationId) ?? [];
      return presenterPool.length > 0;
    });

    if (!candidate) {
      return;
    }

    const presenterPool = presenterPools.get(candidate.presentationId) ?? [];
    const presenter = findAvailablePresenter(presenterPool, assignment.tracks);

    if (!presenter) {
      continue;
    }

    removeValue(presenterPool, presenter);
    assignment.tracks.push({
      roomName: assignment.rooms[0] as string,
      presentation: candidate.presentationId,
      presenter,
    });
  }
}

function assignAttendeesToSlots(
  assignments: AssignedSlotWithoutAttendees[],
  contextModel: SchedulingContextModel,
): Slot[] | null {
  const seenPreferredPresentations = new Map<string, Set<string>>();
  const slots: Slot[] = [];

  for (const assignment of assignments) {
    const attendeesByTrack = assignment.tracks.map(() => [] as string[]);
    const presentersInTime = new Set(assignment.tracks.map((track) => track.presenter));

    for (const attendeeId of contextModel.attendeeIds) {
      if (presentersInTime.has(attendeeId)) {
        continue;
      }

      const seen = seenPreferredPresentations.get(attendeeId) ?? new Set<string>();
      const preferences = contextModel.attendeePreferences.get(attendeeId) ?? [];
      const preferredTrackIndex = preferences.findIndex(
        (presentationId) =>
          !seen.has(presentationId) &&
          assignment.tracks.some(
            (track) => track.presentation === presentationId,
          ),
      );

      if (preferredTrackIndex >= 0) {
        const preferredPresentation = preferences[preferredTrackIndex] as string;
        const trackIndex = assignment.tracks.findIndex(
          (track) => track.presentation === preferredPresentation,
        );

        attendeesByTrack[trackIndex]?.push(attendeeId);
        seen.add(preferredPresentation);
        seenPreferredPresentations.set(attendeeId, seen);
        continue;
      }

      const trackIndex = findLeastLoadedTrackIndex(attendeesByTrack);
      attendeesByTrack[trackIndex]?.push(attendeeId);
    }

    slots.push({
      from: assignment.from,
      until: assignment.until,
      tracks: assignment.tracks.map((track, index) => ({
        ...track,
        attendees: attendeesByTrack[index] ?? [],
      })),
    });
  }

  for (const [attendeeId, preferences] of contextModel.attendeePreferences) {
    const seen = seenPreferredPresentations.get(attendeeId) ?? new Set<string>();

    for (const preferredPresentation of preferences) {
      if (!seen.has(preferredPresentation)) {
        return null;
      }
    }
  }

  return slots;
}

function buildPreferenceConflictGraph(
  attendeePreferences: Map<string, string[]>,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const preferences of attendeePreferences.values()) {
    const uniquePreferences = Array.from(new Set(preferences));

    for (const presentationId of uniquePreferences) {
      graph.set(presentationId, graph.get(presentationId) ?? new Set<string>());
    }

    for (let leftIndex = 0; leftIndex < uniquePreferences.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < uniquePreferences.length;
        rightIndex += 1
      ) {
        const left = uniquePreferences[leftIndex] as string;
        const right = uniquePreferences[rightIndex] as string;
        graph.get(left)?.add(right);
        graph.get(right)?.add(left);
      }
    }
  }

  return graph;
}

function buildPresentationDemand(
  attendeePreferences: Map<string, string[]>,
): Map<string, number> {
  const demand = new Map<string, number>();

  for (const preferences of attendeePreferences.values()) {
    for (const presentationId of new Set(preferences)) {
      demand.set(presentationId, (demand.get(presentationId) ?? 0) + 1);
    }
  }

  return demand;
}

function findAvailablePresenter(
  presenterPool: string[],
  scheduledTracks: ScheduledTrackWithoutAttendees[],
): string | null {
  const presentersInTime = new Set(scheduledTracks.map((track) => track.presenter));

  for (const presenter of presenterPool) {
    if (!presentersInTime.has(presenter)) {
      return presenter;
    }
  }

  return null;
}

function findLeastLoadedTrackIndex(attendeesByTrack: string[][]): number {
  let selectedIndex = 0;

  for (let index = 1; index < attendeesByTrack.length; index += 1) {
    if (
      (attendeesByTrack[index]?.length ?? 0) <
      (attendeesByTrack[selectedIndex]?.length ?? 0)
    ) {
      selectedIndex = index;
    }
  }

  return selectedIndex;
}

function removeValue(values: string[], valueToRemove: string) {
  const index = values.indexOf(valueToRemove);

  if (index >= 0) {
    values.splice(index, 1);
  }
}

function createAtomicSlots(expoDays: ExpoDayContext[]): AtomicSlot[] {
  return expoDays.flatMap((expoDay) =>
    expoDay.slotStartingTimes.flatMap((slotStartingTime) => {
      const from = combineDayAndTime(expoDay.date, slotStartingTime);
      const until = new Date(from.getTime() + expoDay.slotLengthInMin * 60_000);

      return expoDay.rooms.map((roomName) => ({
        roomName,
        from,
        until,
      }));
    }),
  );
}

function groupAtomicSlotsByTime(atomicSlots: AtomicSlot[]): AtomicTimeGroup[] {
  const groups = new Map<string, AtomicTimeGroup>();

  for (const atomicSlot of atomicSlots) {
    const key = `${atomicSlot.from.toISOString()}::${atomicSlot.until.toISOString()}`;
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.rooms.push(atomicSlot.roomName);
      continue;
    }

    groups.set(key, {
      from: atomicSlot.from,
      until: atomicSlot.until,
      rooms: [atomicSlot.roomName],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      rooms: Array.from(new Set(group.rooms)).sort(),
    }))
    .sort((left, right) => left.from.getTime() - right.from.getTime());
}

function combineDayAndTime(day: Date, time: Date): Date {
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      time.getUTCHours(),
      time.getUTCMinutes(),
      time.getUTCSeconds(),
      time.getUTCMilliseconds(),
    ),
  );
}

function shuffle<T>(
  values: T[],
  randomNumberGenerator: () => number,
): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(randomNumberGenerator() * (index + 1));
    const current = result[index];
    result[index] = result[randomIndex] as T;
    result[randomIndex] = current as T;
  }

  return result;
}
