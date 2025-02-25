export DOCKER_BUILDKIT=1
GIT_EMAIL=`git config user.email`
GIT_NAME=`git config user.name`
git clone https://x-token-auth:$DOCS_REPO_API_TOKEN@bitbucket.org/chromawallet/chromia-docs.git docs-repo

./scripts/install-chr-and-pmc.sh

# create TS docs
npm ci
npx typedoc --out docs-repo/static/pages/ft4-ts-client/client

# create rell docs
chr install
chr build
chr generate docs-site --target docs-repo/static/pages/ft4-rell -s doc/docs-chromia.yml

# create changelogs
./scripts/compile-changelog.sh

echo 'Writing changelog page for Rell'
RELL_CHGLOG='docs-repo/docs/ft4/release-history/rell.mdx'
echo '---' > $RELL_CHGLOG
echo 'sidebar_position: 1' >> $RELL_CHGLOG
echo '---' >> $RELL_CHGLOG
echo >> $RELL_CHGLOG
cat rell-changelog.md >> $RELL_CHGLOG

echo 'Writing changelog page for TS'
TS_CHGLOG='docs-repo/docs/ft4/release-history/ts.mdx'
echo '---' > $TS_CHGLOG
echo 'sidebar_position: 2' >> $TS_CHGLOG
echo '---' >> $TS_CHGLOG
echo >> $TS_CHGLOG
cat changelog.md >> $TS_CHGLOG

echo 'Done!'


VERSION=`npm pkg get version | tr -d '"'`
cd docs-repo

# Check if there are changes 
if [ `git status --porcelain | wc -l` -gt 0 ]; then
# Commit and push the changes
BRANCH=ft4-version-$VERSION

git config user.email $GIT_EMAIL
git config user.name $GIT_NAME

git checkout -b $BRANCH
git add .
git commit -m "Update ft4 api docs to version $VERSION"

echo "Pushing the changes to remote"
git push origin $BRANCH
echo "Successfully pushed changes to remote"

echo "Opening a PR in docs repo"
HTTP_STATUS=$(curl -v \
    --header 'Authorization: Bearer '"$DOCS_REPO_API_TOKEN" \
    --header 'Accept: application/json' \
    --header 'Content-Type: application/json' \
    --data '{
        "title": "BUILD_USER: Update ft4 api docs to version '"$VERSION"'",
        "source": {"branch": {"name": "'"$BRANCH"'"}},
        "destination": {"branch": {"name": "master"}},
        "close_source_branch": true
    }' \
    --write-out '%{http_code}' \
    --output response.txt \
    "https://api.bitbucket.org/2.0/repositories/chromawallet/chromia-docs/pullrequests")

if [ "$HTTP_STATUS" -ge 299 ]; then
    echo "Failed to open PR with status <"$HTTP_STATUS"> and message:"
    cat response.txt
    exit 1
fi
else
echo "No changes to commit."
fi