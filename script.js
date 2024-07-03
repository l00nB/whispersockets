var messagewindow = document.getElementById('message-input');
messagewindow.addEventListener('focus', function() {
    messagewindow.setAttribute('placeholder', '')

})
messagewindow.addEventListener('blur', function() {
    messagewindow.setAttribute('placeholder', 'Placeholder')

})

const form = document.getElementById('chat-form')
const input = document.getElementById('message-input')
const messages = document.getElementById('chat-message')

const startbutton = document.getElementById('start-button')
const stopbutton = document.getElementById('stop-button')



function startrecording(){
alert("Test");
}

startbutton.addEventListener('click',startrecording())




