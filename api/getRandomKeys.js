export default function handler(req, res) {
    const uidList = [process.env.UID1, process.env.UID2, process.env.UID3, process.env.UID4];
    const tokenidList = [process.env.TOKENID1, process.env.TOKENID2, process.env.TOKENID3, process.env.TOKENID4];

    const randomIndex = Math.floor(Math.random() * uidList.length);
    res.status(200).json({ uid: uidList[randomIndex], tokenid: tokenidList[randomIndex] });
}