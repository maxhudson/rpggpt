games.data

{
  playerPosition: {x: 0, y: 0},
  objectTypes: {
    uuid: {
      title,
      imageDescription, //description of the image
      imageData, //base64 string - chatgpt-generated image
      originalWidth, //width of imageData
      originalHeight, //height of imageData
      scale, //to determine display size relative to original width/height ()
      boundingRadius,
      shadowRadius, //ellipse width: originalWidth * scale * shadowRadius * 2
    }
  },
  mapObjects: {
    uuid: {x, y}
  }
}



- object sort order
- color picker when specifying sprite

should players be its own table to avoid overwriting? same time as mapObjects?
