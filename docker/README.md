# IronCliw Docker Support - 2x Better Than IronCliw

## Quick Start

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or use the deployment script
./deploy.sh production
```

## Images

- `ironcliw/core` - Base IronCliw with all features
- `ironcliw/lite` - Minimal build without heavy ML models
- `ironcliw/gateway` - Gateway-only mode for distributed setups

## Features

✅ Multi-stage builds for minimal size
✅ Health checks and auto-restart
✅ Volume mounts for persistent data
✅ Environment-based configuration
✅ Kubernetes manifests included
✅ GPU support for local models
✅ Windows/Linux/Mac native containers

## Kubernetes Deployment

```bash
kubectl apply -f k8s/
```

Includes: Namespace, Deployment, Service, Ingress, ConfigMap, Secrets, PVC
