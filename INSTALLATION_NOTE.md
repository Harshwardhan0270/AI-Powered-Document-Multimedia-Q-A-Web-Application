# Installation Note

## Current Status

The application is running but encountering module import errors because the Docker image was built before `groq` and `scikit-learn` were added to `requirements.txt`.

## Issue

The running containers show these errors:
```
Error: No module named 'groq'
Error: No module named 'sklearn'
```

This happens because:
1. The Docker image was built from an older version of `requirements.txt`
2. The source code was updated to use Groq API
3. The image wasn't rebuilt with the new dependencies

## Solution (In Progress)

Installing missing packages directly into the running container:
```bash
docker exec -u root <container> pip install groq==0.13.0 scikit-learn==1.6.1
```

This is faster than rebuilding the entire image (which would re-download 500MB+ of packages).

## Permanent Fix

After the packages are installed, commit the container as a new image:
```bash
docker commit <container> <image-name>
docker compose restart backend
```

Or rebuild the image properly:
```bash
docker compose build --no-cache backend
docker compose up -d
```

## Why This Happened

The development workflow involved:
1. Building initial image with OpenAI dependencies
2. Switching to Groq (free tier) mid-development
3. Updating source code and `requirements.txt`
4. Using `docker commit` to update the image (which only copies files, not installed packages)

## Current Action

Installing packages now. This will take 2-5 minutes due to:
- `groq`: ~100KB (fast)
- `scikit-learn`: ~13MB + dependencies (slower)
- Network speed limitations

Once complete, the application will work correctly.
