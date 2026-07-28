import { useMeetingStore } from "../store";

export function useRole() {
  const { userRoleType } = useMeetingStore();

  const isCreator = userRoleType === "creator";
  const isAttendee = userRoleType === "attendee";

  return {
    userRoleType,
    isCreator,
    isAttendee,
    canControl: isCreator,
  };
}
