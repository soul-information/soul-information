let posts = JSON.parse(localStorage.getItem("soulPosts") || "[]");
let questions = JSON.parse(localStorage.getItem("soulQuestions") || "[]");

// 로그인 없이도 "내가 작성한 답장"을 구분하기 위한 브라우저 전용 키
const REPLY_OWNER_KEY = "soulReplyOwnerToken";
let replyOwnerToken = localStorage.getItem(REPLY_OWNER_KEY);
if(!replyOwnerToken){
  replyOwnerToken = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem(REPLY_OWNER_KEY, replyOwnerToken);
}
function makeReplyToken(){
  return (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const postsEl=document.getElementById("posts");
const questionList=document.getElementById("questionList");
const questionCount=document.getElementById("questionCount");

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function today(){return new Date().toISOString().slice(0,10).replaceAll("-",".");}

/* 검색 */
const searchBtn=document.getElementById("searchBtn");
const searchMessage=document.getElementById("searchMessage");
searchBtn.addEventListener("click",()=>{
  searchMessage.classList.toggle("show");
  searchBtn.classList.toggle("active");
});
document.addEventListener("click",e=>{
  if(!searchBtn.contains(e.target)&&!searchMessage.contains(e.target)) searchMessage.classList.remove("show");
});

/* 게시판 */
function renderPosts(){
  if(!posts.length){
    postsEl.innerHTML=`<div class="empty-posts">아직 게시글이 없어요.<br>첫 번째 글을 남겨보세요! 😊</div>`;
    return;
  }
  postsEl.innerHTML=posts.map((p,i)=>`
    <div class="post" data-index="${i}">
      <span class="num">${i+1}</span>
      <span class="post-title">${escapeHtml(p.title)}</span>
      <span>${escapeHtml(p.author||"익명")}</span>
      <span class="date">${p.date||""}</span>
      <span class="views">${p.views||0}</span>
    </div>`).join("");
  document.querySelectorAll(".post").forEach(row=>{
    row.addEventListener("click",()=>{
      const i=Number(row.dataset.index),p=posts[i];
      p.views=(p.views||0)+1;
      localStorage.setItem("soulPosts",JSON.stringify(posts));
      document.getElementById("viewPostTitle").textContent=p.title;
      document.getElementById("viewPostContent").textContent=p.content||"";
      document.getElementById("viewPostDate").textContent=`${p.author||"익명"} · ${p.date||""}`;
      postViewDialog.dataset.index=i;
      renderReplies(p.replies||[],document.getElementById("postReplies"));
      postViewDialog.showModal();
    });
  });
}
const postDialog=document.getElementById("postDialog");
const postViewDialog=document.getElementById("postViewDialog");
document.getElementById("addPost").onclick=()=>postDialog.showModal();
document.getElementById("cancelPost").onclick=()=>postDialog.close();
document.getElementById("postForm").addEventListener("submit",e=>{
  e.preventDefault();
  const author=document.getElementById("postAuthor").value.trim();
  const title=document.getElementById("postTitle").value.trim();
  const content=document.getElementById("postContent").value.trim();
  if(!author||!title||!content)return;
  posts.unshift({title,content,author,date:today(),views:0,replies:[]});
  localStorage.setItem("soulPosts",JSON.stringify(posts));
  renderPosts();e.target.reset();postDialog.close();
});
document.getElementById("closePostView").addEventListener("click",()=>postViewDialog.close());
document.getElementById("deletePost").addEventListener("click",()=>{
  const i=Number(postViewDialog.dataset.index);
  if(confirm("이 게시글을 삭제할까요?")){posts.splice(i,1);localStorage.setItem("soulPosts",JSON.stringify(posts));postViewDialog.close();renderPosts();}
});

/* 질문 */
const questionDialog=document.getElementById("questionDialog");
const questionViewDialog=document.getElementById("questionViewDialog");
function renderQuestions(){
  questionCount.textContent=`${questions.length}개의 질문`;
  if(!questions.length){
    questionList.innerHTML=`<div class="empty-questions">첫 질문자가 되주실래요?</div>`;
    return;
  }
  questionList.innerHTML=questions.map((q,i)=>`
    <div class="question-item" data-index="${i}">
      <span class="question-number">${String(i+1).padStart(2,"0")}</span>
      <span class="question-title">${escapeHtml(q.title)}</span>
      <span class="question-date">${escapeHtml(q.author||"익명")} · ${q.date||""}</span>
    </div>`).join("");
  document.querySelectorAll(".question-item").forEach(item=>{
    item.addEventListener("click",()=>{
      const i=Number(item.dataset.index),q=questions[i];
      document.getElementById("viewQuestionTitle").textContent=q.title;
      document.getElementById("viewQuestionContent").textContent=q.content;
      document.getElementById("viewQuestionDate").textContent=`${q.author||"익명"} · ${q.date||""}`;
      questionViewDialog.dataset.index=i;
      renderReplies(q.replies||[],document.getElementById("questionReplies"));
      document.getElementById("replyCount").textContent=`${(q.replies||[]).length}개`;
      questionViewDialog.showModal();
    });
  });
}
document.getElementById("askQuestion").addEventListener("click",()=>questionDialog.showModal());
document.getElementById("cancelQuestion").addEventListener("click",()=>questionDialog.close());
document.getElementById("questionForm").addEventListener("submit",e=>{
  e.preventDefault();
  const author=document.getElementById("questionAuthor").value.trim();
  const title=document.getElementById("questionTitle").value.trim();
  const content=document.getElementById("questionContent").value.trim();
  if(!author||!title||!content)return;
  questions.unshift({title,content,date:today(),replies:[],author});
  localStorage.setItem("soulQuestions",JSON.stringify(questions));
  renderQuestions();e.target.reset();questionDialog.close();
});
document.getElementById("closeQuestionView").addEventListener("click",()=>questionViewDialog.close());
document.getElementById("deleteQuestion").addEventListener("click",()=>{
  const i=Number(questionViewDialog.dataset.index);
  if(confirm("이 질문을 삭제할까요?")){questions.splice(i,1);localStorage.setItem("soulQuestions",JSON.stringify(questions));questionViewDialog.close();renderQuestions();}
});

/* 답장 */
const replyDialog=document.getElementById("replyDialog");
let replyTargetType=null,replyTargetIndex=null;
function renderReplies(replies,element){
  if(!element)return;
  if(!replies.length){element.innerHTML=`<div class="reply-empty">아직 답장이 없어요.</div>`;return;}
  element.innerHTML=replies.map((r,i)=>{
    const mine = r.ownerToken && r.ownerToken === replyOwnerToken;
    return `<div class="reply-item" data-reply-index="${i}">
      <div class="reply-content">${escapeHtml(r.content)}</div>
      <small>${escapeHtml(r.author||"익명")} · ${escapeHtml(r.date||"")}</small>
      ${mine ? `<div class="reply-actions"><button type="button" class="reply-edit" data-reply-action="edit">수정</button><button type="button" class="reply-delete" data-reply-action="delete">삭제</button></div>` : ""}
    </div>`;
  }).join("");

  element.querySelectorAll(".reply-item").forEach(item=>{
    const idx=Number(item.dataset.replyIndex);
    item.querySelector('[data-reply-action="edit"]')?.addEventListener("click",()=>editReply(idx));
    item.querySelector('[data-reply-action="delete"]')?.addEventListener("click",()=>deleteReply(idx));
  });
}

function getCurrentReplies(){
  if(replyTargetType === "post") return posts[Number(postViewDialog.dataset.index)]?.replies || [];
  return questions[Number(questionViewDialog.dataset.index)]?.replies || [];
}
function refreshCurrentReplies(){
  if(replyTargetType === "post") renderReplies(posts[Number(postViewDialog.dataset.index)]?.replies || [],document.getElementById("postReplies"));
  if(replyTargetType === "question"){
    const replies=questions[Number(questionViewDialog.dataset.index)]?.replies || [];
    renderReplies(replies,document.getElementById("questionReplies"));
    document.getElementById("replyCount").textContent=`${replies.length}개`;
  }
}
function editReply(index){
  const replies=getCurrentReplies();
  const reply=replies[index];
  if(!reply || reply.ownerToken !== replyOwnerToken) return;
  const next=prompt("답장 내용을 수정해주세요.", reply.content || "");
  if(next===null) return;
  const content=next.trim();
  if(!content){alert("내용을 입력해주세요.");return;}
  reply.content=content;
  reply.edited=true;
  if(replyTargetType === "post") localStorage.setItem("soulPosts",JSON.stringify(posts));
  else localStorage.setItem("soulQuestions",JSON.stringify(questions));
  refreshCurrentReplies();
}
function deleteReply(index){
  const replies=getCurrentReplies();
  const reply=replies[index];
  if(!reply || reply.ownerToken !== replyOwnerToken) return;
  if(!confirm("내가 작성한 이 답장을 삭제할까요?")) return;
  replies.splice(index,1);
  if(replyTargetType === "post") localStorage.setItem("soulPosts",JSON.stringify(posts));
  else localStorage.setItem("soulQuestions",JSON.stringify(questions));
  refreshCurrentReplies();
}
document.getElementById("replyPost").addEventListener("click",()=>{
  replyTargetType="post";replyTargetIndex=Number(postViewDialog.dataset.index);
  document.getElementById("replyDialogTitle").textContent="게시글에 답장하기";
  replyDialog.showModal();
});
document.getElementById("replyQuestion").addEventListener("click",()=>{
  replyTargetType="question";replyTargetIndex=Number(questionViewDialog.dataset.index);
  document.getElementById("replyDialogTitle").textContent="질문에 답장하기";
  replyDialog.showModal();
});
document.getElementById("cancelReply").addEventListener("click",()=>replyDialog.close());
document.getElementById("replyForm").addEventListener("submit",e=>{
  e.preventDefault();
  const author=document.getElementById("replyAuthor").value.trim();
  const content=document.getElementById("replyContent").value.trim();
  if(!author||!content)return;
  const r={content,author,date:today(),ownerToken:replyOwnerToken};
  if(replyTargetType==="post"){
    posts[replyTargetIndex].replies=posts[replyTargetIndex].replies||[];
    posts[replyTargetIndex].replies.push(r);localStorage.setItem("soulPosts",JSON.stringify(posts));
    renderReplies(posts[replyTargetIndex].replies,document.getElementById("postReplies"));
  }else{
    questions[replyTargetIndex].replies=questions[replyTargetIndex].replies||[];
    questions[replyTargetIndex].replies.push(r);localStorage.setItem("soulQuestions",JSON.stringify(questions));
    renderReplies(questions[replyTargetIndex].replies,document.getElementById("questionReplies"));
    document.getElementById("replyCount").textContent=`${questions[replyTargetIndex].replies.length}개`;
  }
  e.target.reset();replyDialog.close();
});

/* 메뉴 */
document.querySelector('a[href="#board"]').addEventListener("click",e=>{e.preventDefault();document.getElementById("board").scrollIntoView({behavior:"smooth",block:"start"});});
document.getElementById("questionsNav").addEventListener("click",e=>{e.preventDefault();const s=document.getElementById("questions");s.scrollIntoView({behavior:"smooth",block:"start"});s.classList.remove("slide-in");void s.offsetWidth;s.classList.add("slide-in");});

/* 스크롤할 때 섹션이 양옆에서 등장 */
const revealItems=[document.querySelector(".hero"),document.querySelector(".board-wrap"),document.querySelector(".questions-section")].filter(Boolean);
revealItems.forEach((el,i)=>{el.classList.add("reveal");if(i%2===1)el.classList.add("from-left");});
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add("is-visible");});},{threshold:.16});
revealItems.forEach(el=>observer.observe(el));

renderPosts();renderQuestions();
