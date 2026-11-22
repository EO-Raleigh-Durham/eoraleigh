// Public member directory roster for this chapter. Shown on /directory.
// Add your members here, or leave the list empty until you are ready.

export type DirectoryMember = {
  name: string;
  company: string;
  industry: string;
  city: string;
  role: string;
};

/** Browser title for /directory. */
export const DIRECTORY_PAGE_TITLE = "Member Directory";

export const DIRECTORY_MEMBERS: DirectoryMember[] = [];
