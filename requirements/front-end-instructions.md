## Gate Security App: Project Overview

This document outlines the requirements for building a web application a [security-guard] role can check the validity of drivers driving into an HOA community.

## Feature Requirements
- **General data requirements**
    -For development use mock data.
- **General app architecture:**
    -Design should use a modern responsive library
    -Each different feature should have it's own route
    -For Authentication use NextAuth.js
- **Member Generation:**
    - [Member] should be able to create an account with the following fields.
        -Name
        -Address
    - [Member] should be able to create a list of allowed people that can visit the address at anytime with a 4 number numberical code
- **System Administrator:**
    -[SystemAdmin] should able to assign the role of [Security Guard]
    -[SystemAdmin] should be able to validate any new [Member] request and approve the generation of the new [Member] or reject the request to become a new [Member]
- **Security Guard Validation:**
    - [Security Guard] should be able to look up the [Member] by address and see the list of allowed people for that address.
    -The adress lookup should be autocomplete and search should not be required to be pressed and should auto show results as parts of the address are typed.

## Current File Structure

.
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── requirements
│   └── front-end-instructions.md
├── src
│   └── app
│       ├── favicon.ico
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
└── tsconfig.json

4 directories, 18 files


## Rules for File Organization

- All new components should be placed in the `/components` folder and named in a consistent format.
- All pages should be placed in the `app` folder.