import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import type { Person } from "../types";

export function PersonAvatar({
  person,
  large = false,
}: {
  person: Person;
  large?: boolean;
}) {
  return (
    <Avatar className={large ? "size-20" : undefined} aria-hidden="true">
      <AvatarImage
        src={large ? person.picture.large : person.picture.thumbnail}
        alt=""
        loading="lazy"
      />
      <AvatarFallback>
        {person.name.first.slice(0, 1)}
        {person.name.last.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  );
}
