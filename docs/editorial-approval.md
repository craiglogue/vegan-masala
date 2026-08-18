# Recipe editorial approval workflow

AI output is a proposal, not a publishable recipe. The default rewrite command writes to `content/recipes_rewritten`; it does not update live content.

Before promotion, a named human reviewer must confirm:

1. Every ingredient and quantity is correct and used exactly where intended.
2. Times, temperatures, pressure settings, frying guidance, yield, storage and reheating claims are safe and realistic.
3. The dish has been test-cooked where quantities or technique changed.
4. Vegan and allergen claims are accurate.
5. Cultural, regional and authenticity language is supportable and restrained.
6. Copy is original; source and image permissions are recorded.
7. Metadata, hero image, links, visible content and JSON-LD agree.
8. `npm run content:check:strict` passes, or every exception is documented.

Promotion must be recipe-by-recipe. Review the source/staged diff, record reviewer and date, then copy only the approved file into `content/recipes`. Bulk promotion is prohibited for unreviewed AI output.
