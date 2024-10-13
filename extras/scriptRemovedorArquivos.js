// O código abaixo deve ser usado no console do navegador para remover todos os arquivos de um tema na plataforma Tray
let theme = $('#theme_id').val();
function removeDirectory(file) {
    $.ajax({
        url: '/v2/themes/' + theme + '/directories/' + file,
        type: 'delete',
        data: {
            delete_directory_id: file,
        },
        processData: !0,
        dataType: 'json',
    });
}
function removeFile(file) {
    $.ajax({
        url: '/v2/themes/' + theme + '/files/' + file,
        type: 'delete',
        data: {
            file_id: file,
        },
        processData: !0,
        dataType: 'json',
    });
}
function listRemove(list) {
    let directory = [];
    list.forEach(function (file) {
        if (!file.nodes) removeFile(file.id);
        if (file.nodes && file.nodes.length) {
            listRemove(file.nodes);
            directory.push(file.id);
        }
    });
    setTimeout(function () {
        directory.forEach(function (directoryID) { 
            removeDirectory(directoryID);
        });
    }, 5000);
}
function getFiles() {
    $.ajax({
        url: '/v2/themes/' + theme + '/files/',
        type: 'GET',
        success: function (files) {
            files.forEach(function (val, index) {
                listRemove(val.nodes);
            });
        },
    });
}
function initRemoveFiles() {
    getFiles();
}
initRemoveFiles();
