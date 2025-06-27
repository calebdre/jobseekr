## MVP Tasks
- [ ] company_summary was added to ai analysis - add it to the database and job card

- [ ] add logic to instead of fetching the first 10 results, a time period is specified and it fetches all results until that time period is reached
    + see @job-posting-dates-analysis.md for advice on fetching dates from google custom search
    + will need to add ability to paginate through results


- [ ] add a way to collapse resume and prefs input when there's at least 1 recommendation

- [ ] make the job card collapsed by default - show the job title and company name, recommendation, and analysis summary. On uncollapse, show the rest of the job card.

- [ ] add loading states and better UX feedback
    + skeleton loading for job cards
    + [x] ability to cancel search in progress
    + add loading states to job actions
    + add animations for each interaction (search, job actions)

- [ ] add error handling for common failures
    + show user-friendly error messages instead of browser alerts
    + add retry button when search fails
    + handle rate limiting from APIs gracefully

- [ ] show the time since last report below the search button

### Maybe
- [ ] instead of using a full web page job posting, extract relevant details from the page and use that to generate the analysis

### Done
- [x] on page load, check DB for processed jobs and display them
- [x] add logic to check if job has already been processed for a given user and skip processing if it has
- [~] [NEEDS TESTING] update analysis
    + make the LLM pay closer attention to the user's  prefs 
    + make it have a stronger judgement
        + instead of 'maybe' being partial fit, 'maybe's are for those where there's not enough information to make a decision. like it fills some things, but maybe remote job is in prefs but the job doesn't specify remote, or location is in prefs but the job doesn't specify location
        + 'skip's are for those where there's a clear mismatch. 
        + 'apply's are for those where there's a clear match.
    + potentially make it a yes/no decision to recommend applying
    + make llm generate (alongside other things): fit summary, job summary, why good fit, potential concerns
- [x] store search state so it can be relayed to users if they refresh the page
    + probably do this via database w/ user id

- [x] add job actions
    + mark jobs as "applied", "not interested", "saved for later"
    + filter/sort results by recommendation, date, fit score


- [x] add button to go to job page to apply


## BUGS
- [ ] if there are jobs already and i click on search, it removes the existing jobs
    + after search is finished, all jobs reappear
- [ ] the tabs filter doesn't consider new jobs
    + after search is finished, the tabs filter does consider new jobs again
    + this is probably due to the job data living in multiple places - there should be just 1 'jobs' array that gets used by the ui and everything else manipulates that array
- [ ] the 'company' column for processed job always says `Jobs` or `Jobs-boards`
- [ ] `location` and `salary` columns are always null or `Remote` even if it's specified in the job posting
- [ ] the job action label on the top left corner sits on top of and blocks the apply/skip/maybe recommendation

## Considerations
- [ ] [INVESTIGATE] we probably don't need to send progress updates to the client in the stream route
- [ ] need to figure out how to organize the filtering - can filter by: recommendation, date, fit score, and job actions taken (i.e. applied, not interested, etc.)


## Post-MVP
- [ ] add a way to sign up for periodic email alerts
    + will involve invoking the search periodically
    + probably use mailgun to send emails
    + need to solve how to trigger the search at regular intervals (in dev + prod envs)
