// The only place the method name, authors, links and citation fields are written.
// Changing `method` renames the method everywhere on the page, including the
// browser title and the BibTeX key.
window.PAGE_CONFIG = {
  method: "SAP3D",
  titleRest: "Spatially Adaptive Personalization for Consistent 3D Generative Editing",
  authors: ["Itan Levin", "Guy Tevet", "Amit H. Bermano"],
  affiliation: "Tel Aviv University",

  // An empty string renders the button as "coming soon" without a link.
  links: {
    paper: "",     // arXiv abstract page
    code: "",      // GitHub repository
    demo: "",      // Hugging Face Space
    adapters: ""   // Hugging Face model repository with the per-asset adapters
  },

  // Path or absolute URL of the interactive comparison viewer.
  viewer: "results_viewer/index.html",

  // `arxiv` is a placeholder until the preprint is posted; replace it with the arXiv number.
  bibtex: {
    year: "2026",
    arxiv: "XXXX.XXXXX"
  }
};
