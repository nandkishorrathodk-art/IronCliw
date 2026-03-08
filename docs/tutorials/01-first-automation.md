# Tutorial 1: Your First Automation

Welcome to IronCliw! Let's write your first batch automation.

1. Create a `hello.yml` file:
```yaml
name: "Hello System"
description: "Prints system info"
steps:
  - name: "Get user"
    command: "whoami"
  - name: "Get date"
    command: "date"
```

2. Run it via the CLI:
`IronCliw run hello.yml`
