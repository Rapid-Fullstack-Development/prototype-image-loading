import React from "react";

//
// Loads a file to a data URL.
//
function loadFile(file) { 
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('error', () => {
            reject(new Error(`Error reading file ${file.name}.`));
        });

        reader.addEventListener('load', evt => {
            resolve(evt.target.result)
        });            
        
        reader.readAsDataURL(file);
    });
}

//
// Loads URL or source data to an image element.
//
function loadImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve(img);
        };
        img.src = imageSrc;
    });
}

//
// Gets the size of an image element.
//
async function getImageResolution(imageSrc) {
    const image = await loadImage(imageSrc);
    return {
        width: image.width,
        height: image.height,
    };
}

//
// Get the base64 representation of the file content.
//
async function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = error => {
            reject(error);
        };    
    });
} 

export class App extends React.Component {

    constructor(props) {
        super(props);

        this.state = {};
    }

    onFilesChanged = async files => {

        const fileInfo = [];

        for (const file of files) {
            const imageData = await loadFile(file);
            const imageResolution = await getImageResolution(imageData);
            const base64 = await getBase64(file);
            fileInfo.push({
                name: file.name,
                size: file.size,
                resolution: imageResolution,
                base64: base64,
            });
        }

        this.setState({
            files: fileInfo,
        });
    };

    render() {
        return (
            <div>
                <p>Select some image files</p>
                <input
                    type="file"
                    multiple={true}
                    onChange={evt => this.onFilesChanged(evt.target.files)}
                    />

                {this.state.files !== undefined
                    && <div>
                        <h2>File to upload:</h2>
                        <table>
                            <tbody>
                                <tr>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Resolution</th>
                                    <th>Base64</th>
                                </tr>
                                {this.state.files.map(file => {
                                    return (
                                        <tr key={file.name}>
                                            <td>
                                                {file.name} 
                                            </td>
                                            <td>
                                                {file.size} 
                                            </td>
                                            <td>
                                                {file.resolution.width}x{file.resolution.height}
                                            </td>
                                            <td>
                                                {file.base64.slice(0, 50)}...
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                }

            </div>
        )
    }
}