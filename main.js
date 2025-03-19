// 初始化地图
const map = L.map('map', {
    maxZoom: 18,
    minZoom: 3,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0
}).setView([30, 120], 3);

// 添加地图底图（使用 Thunderforest 的 OpenCycleMap）
L.tileLayer('https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=03d95e2b3c424dcf95b03dcd86fda401', {
    attribution: 'Maps © <a href="https://www.thunderforest.com/">Thunderforest</a>, Data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    maxZoom: 18
}).addTo(map);

let videoData = []; // 存储当前前端的数据
const locationsRef = db.collection('locations'); // Firestore 集合名称

// 从 Firestore 加载数据
locationsRef.onSnapshot((snapshot) => {
    videoData = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // 确保数据格式正确
      if (data.location && Array.isArray(data.coordinates) && Array.isArray(data.videos)) {
        videoData.push(data);
      } else {
        console.error("忽略无效数据：", data);
      }
    });
    updateMapMarkers();
  });

// 更新地图标记
function updateMapMarkers() {
    // 清除所有现有标记
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // 重新创建标记
    videoData.forEach(createMarker);

    // 更新摄像头计数
    updateCameraCount();
}

// 更新摄像头计数
function updateCameraCount() {
    const cameraCount = videoData.reduce((count, location) => count + location.videos.length, 0);
    document.getElementById('camera-count').textContent = cameraCount;
}

// 页面加载时调用
updateMapMarkers();

// 添加摄像头按钮功能
document.querySelector('.fa-camera').addEventListener('click', () => {
    document.getElementById('addForm').style.display = 'block';
});

// 取消按钮
document.getElementById('cancelAdd').addEventListener('click', () => {
    document.getElementById('addForm').style.display = 'none';
    clearForm();
});

// 添加视频条目
document.getElementById('addVideo').addEventListener('click', () => {
    const newEntry = document.querySelector('.video-entry').cloneNode(true);
    newEntry.querySelectorAll('input').forEach(input => input.value = '');
    document.getElementById('videoEntries').appendChild(newEntry);
});

// 确认添加
document.getElementById('confirmAdd').addEventListener('click', async () => {
    const location = document.getElementById('location').value;
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);

    if (!location || isNaN(lat) || isNaN(lng)) {
        alert('请填写完整地点和坐标信息');
        return;
    }

    const videos = Array.from(document.getElementsByClassName('video-entry')).map(entry => ({
        title: entry.querySelector('.title').value,
        up: entry.querySelector('.up').value,
        date: entry.querySelector('.date').value,
        url: entry.querySelector('.url').value
    })).filter(v => v.title && v.up);

    if (videos.length === 0) {
        alert('请至少添加一个有效视频信息');
        return;
    }

    const newLocation = { location, coordinates: [lat, lng], videos };

    // 保存到 Firestore
    try {
        await locationsRef.add(newLocation); // 使用 add() 添加新数据
        clearForm();
        document.getElementById('addForm').style.display = 'none';
    } catch (error) {
        console.error('保存数据失败：', error);
        alert('保存数据失败');
    }
});

function createMarker(item) {
    const marker = L.marker(item.coordinates, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<i class="fa-solid fa-video" style="color:#ff0000; font-size:24px;"></i>'
        })
    });

    const popupContent = `
        <div class="custom-popup">
            <h3>${item.location}</h3>
            ${item.videos.map(video => `
                <div class="video-item">
                    <a href="${video.url}" target="_blank">
                        ${video.title}<br>
                        <small>UP：${video.up} | ${video.date}</small>
                    </a>
                </div>
            `).join('')}
        </div>`;

    marker.bindPopup(popupContent).addTo(map);
}

function clearForm() {
    document.getElementById('location').value = '';
    document.getElementById('lat').value = '';
    document.getElementById('lng').value = '';
    document.querySelectorAll('.video-entry').forEach((entry, index) => {
        if (index > 0) entry.remove();
        entry.querySelectorAll('input').forEach(input => input.value = '');
    });
}