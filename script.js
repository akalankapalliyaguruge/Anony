const form = document.getElementById('new-post-form');
const postsContainer = document.getElementById('posts-container');

const STORAGE_KEY = 'anony_posts_v1';

// Helpers for localStorage tracking (per-discussion actions)
function hasAction(discussionId, action) {
  const key = `${action}_${discussionId}`;
  return localStorage.getItem(key) === 'true';
}
function setAction(discussionId, action) {
  const key = `${action}_${discussionId}`;
  localStorage.setItem(key, 'true');
}

// Vote helpers: store a single vote per discussion ('up' or 'down')
function getVote(discussionId) {
  return localStorage.getItem(`vote_${discussionId}`); // 'up' | 'down' | null
}
function setVote(discussionId, vote) {
  // vote should be 'up' or 'down'
  if (vote !== 'up' && vote !== 'down') return;
  localStorage.setItem(`vote_${discussionId}`, vote);
}

// Comment vote helpers: use composite keys vote_{postId}_{commentId}
function getCommentVote(postId, commentId) {
  return localStorage.getItem(`vote_${postId}_${commentId}`);
}
function setCommentVote(postId, commentId, vote) {
  if (vote !== 'up' && vote !== 'down') return;
  localStorage.setItem(`vote_${postId}_${commentId}`, vote);
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function loadPosts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse posts from storage', e);
    return [];
  }
}

let posts = loadPosts();
let currentSearch = '';

// Render all stored posts on load (supports optional search filter)
function renderAll() {
  postsContainer.innerHTML = '';
  // newest first
  const list = posts.slice().reverse();
  const shown = currentSearch ? list.filter(p => matchesPost(p, currentSearch)) : list;
  shown.forEach(renderPost);
}

function matchesPost(post, query) {
  const q = query.toLowerCase();
  if (post.title.toLowerCase().includes(q)) return true;
  if (post.description.toLowerCase().includes(q)) return true;
  if (post.tags && post.tags.join(' ').toLowerCase().includes(q)) return true;
  // search comments recursively
  function commentsMatch(items) {
    for (const c of items) {
      if (c.text && c.text.toLowerCase().includes(q)) return true;
      if (c.replies && c.replies.length && commentsMatch(c.replies)) return true;
    }
    return false;
  }
  if (post.comments && post.comments.length && commentsMatch(post.comments)) return true;
  return false;
}

// escape HTML so user content can't inject markup
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// highlight occurrences of query within text (returns safe HTML)
function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const q = String(query).trim();
  if (!q) return escapeHtml(text);
  const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escapedQuery, 'ig');
  let result = '';
  let lastIndex = 0;
  let match;
  const original = String(text);
  while ((match = re.exec(original)) !== null) {
    result += escapeHtml(original.slice(lastIndex, match.index));
    result += `<mark class="search-hit">${escapeHtml(match[0])}</mark>`;
    lastIndex = match.index + match[0].length;
    if (re.lastIndex === match.index) re.lastIndex++;
  }
  result += escapeHtml(original.slice(lastIndex));
  return result;
}

function createPostObject(title, description, tags) {
  return {
    id: Date.now().toString() + Math.floor(Math.random() * 10000),
    title,
    description,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    score: 0,
  comments: [] // structure: { id, text, replies: [], score }
  };
}

function renderPost(post) {
  const postCard = document.createElement('div');
  postCard.className = 'post-card';
  postCard.dataset.discussionId = post.id;

  postCard.innerHTML = `
    <div style="display:flex;">
      <div class="vote-section">
        <button class="upvote" title="Upvote">↑</button>
        <span class="vote-count">${post.score}</span>
        <button class="downvote" title="Downvote">↓</button>
      </div>
      <div class="post-content">
        <h3 class="post-title"></h3>
        <p class="post-description"></p>
        <div class="post-footer">
          <span class="comments-count">0 comments</span>
          <span class="tags"></span>
        </div>
        <div class="comments-section">
          <form class="comment-form">
            <input type="text" class="comment-input" placeholder="Write a comment..." required>
            <button type="submit">Comment</button>
          </form>
          <div class="comments-list"></div>
        </div>
      </div>
    </div>
  `;

  // populate text fields
  // render with highlights when search active
  postCard.querySelector('.post-title').innerHTML = highlightText(post.title, currentSearch);
  postCard.querySelector('.post-description').innerHTML = highlightText(post.description, currentSearch);
  postCard.querySelector('.tags').innerHTML = highlightText(post.tags.map(t => '#' + t).join(' '), currentSearch);

  // elements
  const upBtn = postCard.querySelector('.upvote');
  const downBtn = postCard.querySelector('.downvote');
  const voteCount = postCard.querySelector('.vote-count');
  const commentForm = postCard.querySelector('.comment-form');
  const commentInput = postCard.querySelector('.comment-input');
  const commentsList = postCard.querySelector('.comments-list');
  const commentsCount = postCard.querySelector('.comments-count');

  // reflect stored action state
  const existingVote = getVote(post.id);
  if (existingVote) {
    // disable both vote buttons if user already voted
    upBtn.disabled = true;
    downBtn.disabled = true;
  // add visual indicator for which vote
  if (existingVote === 'up') upBtn.classList.add('voted');
  if (existingVote === 'down') downBtn.classList.add('voted');
  }
  // download removed; no download state

  upBtn.addEventListener('click', () => {
    if (getVote(post.id)) {
      alert('You have already voted on this discussion.');
      upBtn.disabled = true;
      downBtn.disabled = true;
      return;
    }
    post.score += 1;
    voteCount.textContent = post.score;
    setVote(post.id, 'up');
    // optional: mark action for analytics
    setAction(post.id, 'upvote');
    upBtn.disabled = true;
    downBtn.disabled = true;
  upBtn.classList.add('voted');
    savePosts(posts);
  });

  downBtn.addEventListener('click', () => {
    if (getVote(post.id)) {
      alert('You have already voted on this discussion.');
      upBtn.disabled = true;
      downBtn.disabled = true;
      return;
    }
    post.score -= 1;
    voteCount.textContent = post.score;
    setVote(post.id, 'down');
    setAction(post.id, 'downvote');
    upBtn.disabled = true;
    downBtn.disabled = true;
  downBtn.classList.add('voted');
    savePosts(posts);
  });

  // download button removed per request

  // comments
  function updateCommentsUI() {
    commentsList.innerHTML = '';
    const renderComments = (items, parentEl) => {
      items.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment';
        div.dataset.commentId = c.id;
        // ensure score exists
        if (typeof c.score !== 'number') c.score = 0;
        div.innerHTML = `
          <div class="comment-body" style="display:flex; gap:10px; align-items:flex-start;">
            <div class="comment-vote">
              <button class="comment-up" title="Upvote">↑</button>
              <div class="comment-vote-count">${c.score}</div>
              <button class="comment-down" title="Downvote">↓</button>
            </div>
            <div class="comment-main">
              <span class="comment-text"></span>
              <span class="reply-button">Reply</span>
              <div class="comments-list"></div>
            </div>
          </div>
        `;
  // render comment text with highlights
  div.querySelector('.comment-text').innerHTML = highlightText(c.text, currentSearch);
        parentEl.appendChild(div);

        const replyBtn = div.querySelector('.reply-button');
        const nestedList = div.querySelector('.comments-list');
        const up = div.querySelector('.comment-up');
        const down = div.querySelector('.comment-down');
        const voteDisplay = div.querySelector('.comment-vote-count');

        // reflect stored comment-vote state
        const existingCommentVote = getCommentVote(post.id, c.id);
        if (existingCommentVote) {
          up.disabled = true;
          down.disabled = true;
          if (existingCommentVote === 'up') up.classList.add('voted');
          if (existingCommentVote === 'down') down.classList.add('voted');
        }

        up.addEventListener('click', () => {
          if (getCommentVote(post.id, c.id)) {
            alert('You have already voted on this comment.');
            up.disabled = true; down.disabled = true; return;
          }
          c.score += 1;
          voteDisplay.textContent = c.score;
          setCommentVote(post.id, c.id, 'up');
          up.classList.add('voted');
          up.disabled = true; down.disabled = true;
          savePosts(posts);
        });

        down.addEventListener('click', () => {
          if (getCommentVote(post.id, c.id)) {
            alert('You have already voted on this comment.');
            up.disabled = true; down.disabled = true; return;
          }
          c.score -= 1;
          voteDisplay.textContent = c.score;
          setCommentVote(post.id, c.id, 'down');
          down.classList.add('voted');
          up.disabled = true; down.disabled = true;
          savePosts(posts);
        });

        replyBtn.addEventListener('click', () => {
          if (div.querySelector('.reply-form')) return;
          const replyForm = document.createElement('form');
          replyForm.className = 'reply-form';
          replyForm.innerHTML = `
            <input type="text" class="reply-input" placeholder="Write a reply..." required>
            <button type="submit">Reply</button>
          `;
          div.appendChild(replyForm);

          replyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const replyInput = replyForm.querySelector('.reply-input');
            const replyText = replyInput.value.trim();
            if (!replyText) return;
            const replyObj = { id: Date.now().toString() + Math.floor(Math.random() * 1000), text: replyText, replies: [], score: 0 };
            c.replies = c.replies || [];
            c.replies.push(replyObj);
            savePosts(posts);
            updateCommentsUI();
          });
        });

        // render nested replies
        if (c.replies && c.replies.length) renderComments(c.replies, nestedList);
      });
    };

    renderComments(post.comments, commentsList);
    commentsCount.textContent = `${countComments(post.comments)} comments`;
  }

  function countComments(items) {
    let count = 0;
    items.forEach(c => {
      count += 1;
      if (c.replies && c.replies.length) count += countComments(c.replies);
    });
    return count;
  }

  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const commentText = commentInput.value.trim();
    if (!commentText) return;
    const commentObj = { id: Date.now().toString() + Math.floor(Math.random() * 1000), text: commentText, replies: [] };
    post.comments.push(commentObj);
    savePosts(posts);
    commentInput.value = '';
    updateCommentsUI();
  });

  // initial comments render
  updateCommentsUI();

  postsContainer.appendChild(postCard);
}

// form submit: create post, persist and render
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('post-title').value.trim();
  const description = document.getElementById('post-description').value.trim();
  const tags = document.getElementById('post-tags').value.trim();
  if (!title || !description) return;
  const post = createPostObject(title, description, tags);
  posts.push(post);
  savePosts(posts);
  // render newly created post at top
  renderAll();
  form.reset();
});

// initial render on page load
renderAll();
// Search box wiring
const searchBox = document.getElementById('search-box');
if (searchBox) {
  let debounce;
  searchBox.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentSearch = e.target.value.trim();
      renderAll();
    }, 150);
  });
}
