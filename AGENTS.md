<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data.
Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UrbanMiles Agent Rules (STRICT)

You are working on the UrbanMiles codebase. Stability is critical. Do NOT break existing features.

---

## 🔴 Execution Mode (MANDATORY)

- Use SINGLE AGENT execution only.
- Do NOT create or use sub-agents, planners, reviewers, or orchestration.
- Do NOT split tasks into steps internally.
- Do NOT generate plans unless explicitly asked.
- Execute tasks directly and minimally.

---

## 🧠 Before Editing

- Understand the exact task.
- Inspect relevant files first.
- If unsure about code, Next.js behavior, or libraries → use internet search to verify.

---

## ⚙️ Core Rules

- Make minimal, targeted changes only.
- Do NOT rewrite full components unless absolutely required.
- Do NOT refactor unrelated code.
- Do NOT rename APIs, Prisma schema, or core logic.
- Do NOT introduce new architecture or abstractions.
- Do NOT add fake/mock data.
- Do NOT touch unrelated parts of the app.

---

## 🛑 Critical Protection (DO NOT BREAK)

- Booking flow
- OTP / authentication
- Pricing logic
- Admin panel
- UI structure/layout

---

## 🧩 Code Safety Rules

- Never use undefined variables.
- Always define and import:
  - refs
  - hooks
  - state variables
- Do NOT leave partial implementations.
- Do NOT duplicate UI logic.
- Keep styling consistent with existing design.

---

## 🔧 Error Handling

- Fix ONLY the reported issue.
- Do NOT introduce new features while fixing bugs.
- Avoid over-engineering.
- Keep logic simple and predictable.

---

## 🌐 External Help

- You have access to the internet.
- If unsure, verify implementation using reliable sources before coding.

---

## ✅ After Editing (MANDATORY)

- Ensure NO TypeScript errors
- Ensure NO build errors
- Check for:
  - undefined variables
  - broken imports
  - syntax issues

---

## 📤 Output Format

- What changed
- Files modified