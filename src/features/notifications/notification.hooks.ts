import { useEffect, useMemo, useState } from "react";

import { subscribeToUsers } from "@/features/auth/auth.service";
import {
  deviceKind,
  subscribeToPushDevices,
  type PushDevice,
} from "@/features/notifications/push-subscribers";
import { getErrorMessage } from "@/lib/errors";
import { EMPTY_STAT_TOTALS, type UserProfile } from "@/types/user";

export type PushSubscriber = {
  user: UserProfile;
  devices: PushDevice[];
  deviceLabels: string[];
};

export function usePushSubscribers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [usersReady, setUsersReady] = useState(false);
  const [devicesReady, setDevicesReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return subscribeToUsers(
      (nextUsers) => {
        setUsers(nextUsers);
        setUsersReady(true);
        setErrorMessage("");
      },
      (message) => {
        setUsers([]);
        setUsersReady(true);
        setErrorMessage(getErrorMessage(new Error(message), message));
      },
    );
  }, []);

  useEffect(() => {
    return subscribeToPushDevices(
      (nextDevices) => {
        setDevices(nextDevices);
        setDevicesReady(true);
        setErrorMessage("");
      },
      (error) => {
        setDevices([]);
        setDevicesReady(true);
        setErrorMessage(getErrorMessage(error, "Could not load push subscribers."));
      },
    );
  }, []);

  const subscribers = useMemo(() => {
    const usersById = new Map(users.map((user) => [user.id, user]));
    const devicesByUser = new Map<string, PushDevice[]>();

    for (const device of devices) {
      const list = devicesByUser.get(device.userId) ?? [];
      list.push(device);
      devicesByUser.set(device.userId, list);
    }

    return [...devicesByUser.entries()]
      .map(([userId, userDevices]) => {
        const user = usersById.get(userId) ?? {
          id: userId,
          email: "",
          displayName: "Unknown user",
          role: "user",
          isActive: true,
          position: "",
          stats: EMPTY_STAT_TOTALS,
        };

        return {
          user,
          devices: userDevices,
          deviceLabels: [...new Set(userDevices.map((device) => deviceKind(device.userAgent)))],
        } satisfies PushSubscriber;
      })
      .sort((left, right) => left.user.displayName.localeCompare(right.user.displayName));
  }, [devices, users]);

  return {
    subscribers,
    peopleCount: subscribers.length,
    deviceCount: devices.length,
    loading: !usersReady || !devicesReady,
    errorMessage,
  };
}
