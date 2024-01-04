#/bin/bash

pnpm i
pnpm run build

CGO_ENABLED=0 GOOS=windows  GOARCH=amd64  go build -o feishu-backup.exe
CGO_ENABLED=0  GOOS=linux  GOARCH=amd64  go build -o feishu-backup
CGO_ENABLED=0 GOOS=darwin  GOARCH=amd64  go build -o feishu-backup-mac


mkdir publish
zip -r publish/windows.zip feishu-backup.exe dist
zip -r publish/linux.zip feishu-backup dist
zip -r publish/mac.zip feishu-backup-mac dist