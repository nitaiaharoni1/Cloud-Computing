getPictures();

function getPictures(){
    $.ajax({
        type: 'GET',
        url: 'http://localhost:3000/pictures'
    }).done(function(data){
        let pictures = data;
        pictures.forEach(function(element, index){
            let gallery = document.getElementById("gallery");
            let div1 = document.createElement("div");
            div1.className = "gallery-item";
            div1.tabindex = "0";

            let img = document.createElement("IMG");
            img.setAttribute("src", pictures[index]);
            img.className = "gallery-image";

            div1.appendChild(img);
            gallery.appendChild(div1);
        });
    }).fail(function(){
        alert("error");
    });
}

function addPicture(){
    let form_data = new FormData();
    let image_file = document.getElementById("image_input").files[0];
    form_data.append("image_file", image_file);

    jQuery.ajax({
        url: "http://localhost:3000/picture",
        type: "POST",
        data: form_data,
        processData: false,
        contentType: false,
        success: function(data){
            console.log("Picture: " + image_file.name + " was added")
        },
        error: function(e){
            console.log("Error: " + e)
        },
    });

    location.reload();
}

function sendMail(){
    let form = document.getElementById("application_button");
    let name = form.getElementsById("name").value;


    $.ajax({
        mailto: "nivohana@walla.com",
        type: "POST",
        data: "Hello my name is: " + name,
        success: function(data){
            console.log("Success: " + data + " was added")
        },
        error: function(e){
            console.log("Error: " + e)
        },
    });

    location.reload();
}

