## MVP Tasks
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

- [ ] [INVESTIGATE] we probably don't need to send progress updates to the client in the stream route

- [ ] add error handling for common failures
    + show user-friendly error messages instead of browser alerts
    + add retry button when search fails
    + handle rate limiting from APIs gracefully

- [ ] add loading states and better UX feedback
    + skeleton loading for job cards
    + ability to cancel search in progress


- [ ] add job actions
    + mark jobs as "applied", "not interested", "saved for later"
    + filter/sort results by recommendation, date, fit score

- [ ] update the UI to use things that look better
    + aceternity components
    + show recommended jobs first

- [ ] add button to go to job page to apply

- [ ] add logic to instead of fetching the first 10 results, a time period is specified and it fetches all results until that time period is reached
    + see @job-posting-dates-analysis.md for advice on fetching dates from google custom search
    + will need to add ability to paginate through results

## Post-MVP
- [ ] add a way to sign up for periodic email alerts
    + will involve invoking the search periodically
    + probably use mailgun to send emails
    + need to solve how to trigger the search at regular intervals (in dev + prod envs)
