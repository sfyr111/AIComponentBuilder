# AI-Powered UI Component Generator

This project is a Next.js web application that uses AI technology to help developers quickly generate React component code through natural language descriptions or image designs.

## Key Features

- **Natural Language to Component Generation**: Describe the UI component you want, and AI will generate the corresponding React code
- **Image to Code Conversion**: Upload UI design images for automatic analysis and conversion into usable React components
- **Real-time Code Preview**: Instantly view generated code and make adjustments
- **Copy-Paste Image Support**: Directly copy and paste images into the application for analysis and conversion
- **Multi-model Support**: Utilize various advanced AI models to optimize code generation results

## Technology Stack

- **Frontend Framework**: Next.js 15.3.1, React 19
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor
- **AI Integration**: OpenAI API, Deepseek API
- **UI Components**: Radix UI
- **State Management**: React Hooks
- **Build Tool**: Turbopack

## Quick Start

### Environment Setup

1. Ensure Node.js 18.0.0 or higher is installed
2. Clone the project to your local machine

### Environment Variable Configuration

Create a `.env.local` file in the project root directory (you can copy from `.env.local.example`), and set the following variables:

```
ARK_API_KEY=your_ark_api_key
BLOB_READ_WRITE_TOKEN=your_blob_token
```

### Install Dependencies

```bash
npm install
# or
yarn
# or
pnpm install
```

### Start Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## How to Use

1. Describe the UI component you want in the input field on the main page
2. Or paste/upload a UI design image
3. After submission, AI will analyze your requirements and generate React component code
4. View and adjust the generated code in the right panel
5. Copy the code directly into your project for use

## Project Structure

```
/app                 - Next.js application pages and routes
  /api               - API routes
    /chat            - Chat and code generation API
    /image-analyze   - Image analysis API
/components          - React components
  /chat              - Chat interface components
  /canvas            - Code preview and editing components
  /ui                - Common UI components
/lib                 - Utility functions and services
/public              - Static assets
```

## Contribution Guidelines

Pull Requests and Issues are welcome to help improve this project.

## License

[MIT](LICENSE)
