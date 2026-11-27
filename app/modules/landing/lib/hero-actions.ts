export type HeroAction = {
  label: string;
  to: string;
  emphasis: "primary" | "secondary";
};

const browseCourses: HeroAction = {
  label: "Browse Courses",
  to: "/courses",
  emphasis: "primary",
};

const signUp: HeroAction = {
  label: "Create a free account",
  to: "/signup",
  emphasis: "secondary",
};

const dashboard: HeroAction = {
  label: "Go to your dashboard",
  to: "/dashboard",
  emphasis: "secondary",
};

export function actionsFor(viewer: { id: number } | null): HeroAction[] {
  return [browseCourses, viewer ? dashboard : signUp];
}
