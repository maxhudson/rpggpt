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

- hide/toggle hud on mobile


rename objectType to elementType
add game.objectTypeIds rather than objectType having a gameId
store image in bucket rather than in db
- change scale, offset etc unit to be in grid units (i.e. width in grid units)

don't let zoom impact offset - offset should no longer be necessary thanks to playerPosition
