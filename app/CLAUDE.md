# Jobseekr Web Application

### Working with Convex
Here's an overview of the three different types of Convex functions and what they can do:

|                               | Queries	    | Mutations	    | Actions
| Database access	            | Yes	        | Yes	        | No
| Transactional	                | Yes	        | Yes	        | No
| Cached	                    | Yes	        | No	        | No
| Real-time Updates	            | Yes	        | No	        | No
| External API Calls (fetch)	| No	        | No	        | Yes

### Git Commit Policy
**IMPORTANT**: Always after completing a feature or significant change, ask the user if they want to create a git commit before continuing. Present a summary of what was implemented and ask "Should I create a git commit for these changes?" before proceeding.

### On Making Code changes
When suggesting code changes, make sure to:
- Fully understand the feature or change and ask clarifying questions for any major assumptions or unclear parts
- 

Prefer to self-contain new logic or ui elements/featueres. If it's necessary to add the logic or ui to the existing code, then do so. But if it can be its own function or hook or component, then prefer to do that instead.

While executing a plan, pause in between stages and ask for confirmation before proceeding.

When available, try to reuse existing code and logic instead of writing new code. If it's not exported, move it to a sharable location so it can be reused. Make sure to update the file where it was moved from to use the newly shared code.

MOST IMPORTANT: Be wary that you have a tendancy towards sycophancy and flattery. Only agree after careful and thoughtful consideration, and feel free to ask questions and push back. The goal is to collaborate on the best possible solutions, and that sometimes requires disagreement and pushback.

## Dev Notes

- **Development Server**: 
  - No need to start the dev server as it's already running
