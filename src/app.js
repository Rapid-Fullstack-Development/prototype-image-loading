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
// Resizes an image.
//
// https://stackoverflow.com/a/43354901/25868
//
function resizeImage(imageData, maxSize) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const oc = document.createElement('canvas'); // As long as we don't reference this it will be garbage collected.
            const octx = oc.getContext('2d')!;
            oc.width = img.width;
            oc.height = img.height;
            octx.drawImage(img, 0, 0);

            // Commented out code could be useful.
            // if( img.width > img.height) {
            //     oc.height = (img.height / img.width) * max;
            //     oc.width = max;
            // } 
            // else {
                oc.width = (img.width / img.height) * maxSize;
                oc.height = maxSize;
            // }

            octx.drawImage(oc, 0, 0, oc.width, oc.height);
            octx.drawImage(img, 0, 0, oc.width, oc.height);
            resolve(oc.toDataURL());
        };
        img.src = imageData;
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
            const thumbnailData = await resizeImage(imageData, 25);
            fileInfo.push({
                name: file.name,
                contentType: file.type,
                size: file.size,
                resolution: imageResolution,
                imageData: imageData,
                thumbnailData: thumbnailData,
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
                        <h2>File to upload</h2>
                        <table>
                            <tbody>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
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
                                                {file.contentType} 
                                            </td>
                                            <td>
                                                {file.size} 
                                            </td>
                                            <td>
                                                {file.resolution.width}x{file.resolution.height}
                                            </td>
                                            <td>
                                                {file.imageData.slice(0, 50)}...
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <h2>Thumbnails</h2>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                            }}
                            >
                            {this.state.files.map(file => {
                                return (
                                    <div id={file.name + "-thumb"}>
                                        <img 
                                            src={file.thumbnailData}
                                            style={{
                                                height: "100px",
                                            }}
                                            />
                                    </div>
                                )
                            })}
                        </div>

                        <h2>Images</h2>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                            }}
                            >
                            {this.state.files.map(file => {
                                return (
                                    <div id={file.name + "-full"}>
                                        <img 
                                            src={file.imageData} 
                                            style={{
                                                height: "100px",
                                            }}
                                            />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                }

            </div>
        )
    }
}