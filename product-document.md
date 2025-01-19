# Product Requirements Document (PRD)

## Product Name
RunJS

## Overview
RunJS is a Docker-based application designed to provide a seamless environment for JavaScript developers to write, execute, and test scripts. The application runs as a web-based interface, allowing developers to interact with it via a browser. Users can select a specific Node.js version, and the corresponding Docker container is launched to handle script execution.

## Goals
- Provide developers with the ability to select and switch between multiple Node.js versions.
- Ensure scripts run in isolated environments using Docker containers.
- Offer a web-based interface for writing, executing, and viewing JavaScript output.
- Simplify environment setup and management for developers.

## Features

### 1. Node.js Version Selection
- **Description**: Users can select a Node.js version by specifying it in the Docker run command.
- **Usage**: `docker run runjs:<version>`
- **Functionality**:
  - The specified Node.js version determines the Docker image to be used.
  - Example: `docker run runjs:14` boots a container with Node.js version 14.

### 2. Web-Based Interface
- **Description**: A lightweight web server runs inside the container, providing an intuitive interface.
- **Features**:
  - Left panel: Text editor for writing JavaScript code.
  - Right panel: Output console displaying the result of the executed script.
  - Syntax highlighting and auto-completion for JavaScript.
  - Clear and reset options for both panels.

### 3. Docker Integration
- **Description**: Docker containers are used to ensure scripts run in isolated environments.
- **Implementation**:
  - Each Node.js version has a prebuilt Docker image.
  - Example Dockerfile content:
    ```Dockerfile
    FROM node:<version>
    WORKDIR /app
    COPY . /app
    RUN npm install
    CMD ["node", "server.js"]
    ```
  - Containers run a lightweight web server to interact with the user.

### 4. Script Execution
- **Description**: Users can execute their scripts and view the output in the web interface.
- **Steps**:
  - The script is sent via the web interface to the container.
  - The container processes the script and returns the output.
  - Output is displayed in the web console.
- **Edge Cases**:
  - Handle syntax errors and display meaningful error messages.
  - Graceful handling of container crashes or timeout issues.

### 5. Automatic Package Installation
- **Description**: Automatically installs missing packages used in the script.
- **Functionality**:
  - Parse the script for `require` or `import` statements.
  - Install any missing packages in the container before execution.
  - Ensure installed packages are only available within the container to maintain isolation.

## Technical Requirements

### 1. Docker
- **Purpose**: Manage isolated environments for script execution.
- **Details**:
  - Each Node.js version has a corresponding Docker image.
  - Images include a lightweight web server to provide the UI.
  - Example usage: `docker run -p 8080:8080 runjs:14` exposes the web interface on port 8080.

### 2. Web Server
- **Framework**: Express.js or similar lightweight framework.
- **Features**:
  - Serve a simple web interface.
  - Handle API requests for script execution and dependency management.

### 3. Code Editor
- **Library**: Monaco Editor or CodeMirror.
- **Features**:
  - Syntax highlighting.
  - Auto-completion for JavaScript.
  - Error highlighting.

### 4. Communication
- **Between Web Interface and Server**: Use HTTP APIs to send scripts, retrieve outputs, and manage dependencies.
- **Package Installation**: Use `npm` or `yarn` within the container to install required packages.

## User Stories

### 1. Select Node.js Version
- **As a user**, I want to specify the Node.js version when running the container so that I can ensure compatibility with my scripts.

### 2. Write and Execute Script
- **As a user**, I want to write and run scripts in a web-based interface so that I can see the output immediately.

### 3. View Output
- **As a user**, I want to see the execution output in a separate panel so that I can debug and refine my code.

### 4. Handle Errors
- **As a user**, I want clear error messages so that I can identify and fix issues in my scripts.

### 5. Automatic Dependency Management
- **As a user**, I want the app to automatically install missing dependencies so that I can focus on coding without manually managing packages.

## Success Metrics
- Time taken to boot Docker containers should be under 5 seconds.
- Script execution and output display should have minimal latency (under 2 seconds).
- Error handling should cover 95% of common syntax and runtime errors.
- Automatic package installation success rate should be 99% for valid scripts.
- UI should maintain a user satisfaction score of 90% or above in beta testing.

## Non-Goals
- The app will not include features for advanced debugging (e.g., breakpoints, step-through debugging) in this version.
- The app will not support non-JavaScript languages or frameworks.

## Timeline
### Phase 1: Docker Image Development (4 weeks)
- Create Dockerfiles for supported Node.js versions.
- Set up a lightweight web server inside containers.

### Phase 2: Web Interface Development (3 weeks)
- Build the web interface with code editor and output console.
- Implement script execution and package installation.

### Phase 3: Final Release (2 weeks)
- Refine UI/UX based on user feedback.
- Optimize container performance and error handling.

## Risks
- Docker container boot time may exceed acceptable limits for certain configurations.
- Potential compatibility issues with older or less common Node.js versions.
- User machine resources may limit performance (e.g., RAM or CPU constraints).
- Network connectivity issues may delay automatic package installation.

