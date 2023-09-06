async function getUsernameFromUUID(uuid, maxRetries = 3, timeout = 10000) {

  async function fetchUsername() {
    try {
      const response = await fetch(`https://minecraft.tympanicblock612.repl.co/session/minecraft/profile/${uuid}`)

      if (response.status === 400) return null

      if (response.status === 200) {
        const data = await response.json()
        if (data.name) {
          return data.name
        }
      }

      //console.error(`Failed to retrieve username for UUID ${uuid}. Status code: ${response.status}`)
      return null
    } catch (error) {
      //console.error(`An error occurred while fetching the username for UUID ${uuid}: ${error}`)
      return null
    }
  }

  async function getUsernameWithRetry(retriesLeft) {
    const result = await Promise.race([
      fetchUsername(),
      new Promise((resolve) => setTimeout(() => resolve(null), timeout))
    ])

    if (result !== null) {
      return result
    } else if (retriesLeft > 0) {
      //console.log(`Retry ${maxRetries - retriesLeft + 1} after timeout for UUID ${uuid}`)
      return getUsernameWithRetry(retriesLeft - 1)
    } else {
      //console.error(`Max retries reached for UUID ${uuid}`)
      return null
    }
  }

  return getUsernameWithRetry(maxRetries)
}


async function mapUUIDtoCAPE() {
  const capes = {}
  const owners = {}
  const organizedCapes = {}
  const capeOwnersResponse = await fetch("https://meteorclient.com/api/capeowners")
  const capeOwnersData = await capeOwnersResponse.text()
  const capeOwners = capeOwnersData.split("\n")
  const capesDataResponse = await fetch("https://meteorclient.com/api/capes")
  const capesData = await capesDataResponse.text()
  const capesDataArray = capesData.split("\n")

  const cached = window.localStorage.getItem("uuids-usernames")

  if (cached != null && cached != undefined) {
    let jsonCache = JSON.parse(cached)
    for (const owner of capeOwners) {
      const parts = owner.split(" ")
      if (Object.keys(jsonCache).includes(parts[0])) {
        owners[parts[0]] = { username: jsonCache[parts[0]], cape: parts[1] }
      } else {
        let name = await getUsernameFromUUID(parts[0], 10, 30000)
        owners[parts[0]] = { username: name, cape: parts[1] }
        jsonCache[parts[0]] = name
      }
    }
    window.localStorage.setItem("uuids-usernames", JSON.stringify(jsonCache))
  } else {
    const newcache = {}
    for (const owner of capeOwners) {
      const parts = owner.split(" ")
      owners[parts[0]] = { username: await getUsernameFromUUID(parts[0], 10, 30000), cape: parts[1] }
      newcache[parts[0]] = owners[parts[0]].username
    }
    window.localStorage.setItem("uuids-usernames", JSON.stringify(newcache))
  }

  for (const cape of capesDataArray) {
    const parts = cape.split(" ")
    if (parts.length === 2) {
      const [key, value] = parts
      organizedCapes[key] = value
    }
  }

  for (const player of Object.keys(owners)) {
    capes[owners[player].username] = organizedCapes[owners[player].cape]
  }

  return capes
}

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea")
  textArea.value = text
  textArea.style.top = "0"
  textArea.style.left = "0"
  textArea.style.position = "fixed"
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    var successful = document.execCommand('copy')
    var msg = successful ? 'successful' : 'unsuccessful'
    console.log('Fallback: Copying text command was ' + msg)
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err)
  }

  document.body.removeChild(textArea)
}

function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text)
    return
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!')
  }, function(err) {
    console.error('Async: Could not copy text: ', err)
  })
}

function addBlock(name, capeUrl) {
  let block = document.createElement("div")
  block.classList.add("block")
  let nameh3 = document.createElement("h3")
  nameh3.innerText = name
  let cape = document.createElement("img")
  cape.src = capeUrl
  cape.onerror = () => {
    block.remove()
    console.error(`Failed to load image for ${name}`)
  }
  cape.onclick = () => {
    copyTextToClipboard(capeUrl)
  }
  block.appendChild(nameh3)
  block.appendChild(cape)
  let grid = document.getElementsByClassName("capes-grid")[0]
  grid.appendChild(block)
}

function search(topic) {
  let grid = document.getElementsByClassName("capes-grid")[0];
  for (const child of grid.children) {
    let name = child.getElementsByTagName("h3")[0];
    let cape = child.getElementsByTagName("img")[0];
    let nameText = name.innerText.trim().toLowerCase()
    if ((topic === null || topic === "") || nameText.startsWith(topic)) {
      child.style.display = "block";
    } else {
      child.style.display = "none";
    }
  }
}


window.onload = () => {
  const inputField = document.getElementsByClassName('Search')[0]
  console.log(window.localStorage.getItem("uuids-usernames"))

  let typingTimer
  const doneTypingInterval = 1000
  inputField.addEventListener('input', function() {
    clearTimeout(typingTimer)
    typingTimer = setTimeout(doneTyping, doneTypingInterval)
  })

  function doneTyping() {
    search(inputField.value.toLowerCase())
  }

  inputField.addEventListener('blur', doneTyping)

  mapUUIDtoCAPE().then((result) => {
    Object.entries(result).forEach(([key, value]) => {
      if (value !== "https://meteorclient.com/capes/moderator.png" && value !== "https://meteorclient.com/capes/donator.png") {
        addBlock(key, value)
      }
    });
  })
}
