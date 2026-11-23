'use strict';
// GitHub can report upload success before its artifact listing is available.
async function waitForArtifact({fetchImpl=fetch, sleep=ms=>new Promise(r=>setTimeout(r,ms)), env=process.env, log=console.log}={}) {
 const {GITHUB_API_URL='https://api.github.com',GITHUB_REPOSITORY,GITHUB_RUN_ID,GITHUB_TOKEN,PAGES_ARTIFACT_NAME}=env;
 if(!GITHUB_REPOSITORY||!GITHUB_RUN_ID||!GITHUB_TOKEN||!PAGES_ARTIFACT_NAME)throw Error('Missing artifact-check configuration');
 const url=`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/artifacts?per_page=100`;
 for(let attempt=1;attempt<=12;attempt++) {
  try {
   const response=await fetchImpl(url,{headers:{Authorization:`Bearer ${GITHUB_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000)});
   if(response.status===401||response.status===403||response.status===404)throw Object.assign(Error(`Artifact API HTTP ${response.status}: check Actions read permission and repository access`),{fatal:true});
   if(!response.ok)throw Error(`Artifact API HTTP ${response.status}`);
   const data=await response.json();
   const artifact=(data.artifacts||[]).find(a=>a.name===PAGES_ARTIFACT_NAME&&!a.expired&&a.size_in_bytes>0);
   if(artifact){log(`Artifact verified: ${artifact.name} (${artifact.id})`);return artifact;}
   log(`Artifact not visible yet (${attempt}/12)`);
  }catch(error){if(error.fatal)throw error;log(`Artifact check retry (${attempt}/12): ${error.message}`);}
  if(attempt<12)await sleep(10000);
 }
 throw Error('Pages artifact not confirmed after 12 attempts. Deployment stopped; existing site is unchanged.');
}
module.exports={waitForArtifact};
if(require.main===module)waitForArtifact().catch(e=>{console.error(e.message);process.exitCode=1;});
