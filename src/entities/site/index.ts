// The chapter app's stand-in for edge8-web's site entity (EO-owned): the slice the
// Marketing System reads. The post renderer and FAQ extraction are edge8's;
// categories and pillar theses are the chapter's.
export { categories, type PostMeta } from "./lib/postData";
export { renderPostMarkdown, extractFaq, type Post } from "./lib/posts";
export { pillarsFrom, type Pillar } from "./lib/pillars";
