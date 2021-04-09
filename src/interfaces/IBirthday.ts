export interface IBirthday {
  _id: string,
  birthDate: Date,
  tgUserId: number
}

export interface IBirthdayInputDTO {
  birthDate: Date,
  tgUserId: number
}
