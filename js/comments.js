// Comment system functionality
document.addEventListener('DOMContentLoaded', function() {
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.querySelector('.comments__list');
    
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const comment = document.getElementById('comment').value;
            
            // Validate input
            if (!name.trim() || !comment.trim()) {
                alert('Please fill out all required fields');
                return;
            }
            
            // Create new comment element
            const newComment = document.createElement('li');
            newComment.className = 'comments__item';
            
            // Get current date
            const now = new Date();
            const dateString = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Set comment HTML
            newComment.innerHTML = `
                <div class="comments__item-header">
                    <span class="comments__item-author">${name}</span>
                    <span class="comments__item-date">${dateString}</span>
                </div>
                <div class="comments__item-content">
                    <p>${comment}</p>
                </div>
            `;
            
            // Add to comments list
            commentsList.prepend(newComment);
            
            // Reset form
            commentForm.reset();
            
            // Show success message
            alert('Comment submitted successfully!');
        });
    }
});
