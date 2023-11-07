pnpm i
pnpm run build

SET CGO_ENABLED=0
SET GOOS=windows
SET GOARCH=amd64
go build -o feishu-backup.exe

SET CGO_ENABLED=0
SET GOOS=darwin
SET GOARCH=amd64
go build -o feishu-backup-mac

SET CGO_ENABLED=0
SET GOOS=linux
SET GOARCH=amd64
go build -o feishu-backup

mkdir publish