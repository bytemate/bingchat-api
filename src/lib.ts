import axios from "axios";

// axios({
// 	"method": "GET",
// 	"url": "https://bing.kpham.workers.dev/"
// })
// {
//     "conversationId": "51D|1399543D639E6F982DA8B94FC432D2828B9BDE83BC94B87729DE5733962C3C88",
//     "clientId": "844425381833033",
//     "conversationSignature": "iiNR+fokVHWIHfhqbUncIKqVvSB5R+gdJJzr9t/+J3c=",
//     "result": {
//         "value": "Success",
//         "message": null
//     }
// }
interface ConversationInfo {
  conversationId: string;
  clientId: string;
  conversationSignature: string;
  result: {
    value: string;
    message: string;
  };
}

export const getConversationInfo = async (): Promise<ConversationInfo> => {
  const response = await axios({
    method: "GET",
    url: "https://bing.kpham.workers.dev/",
  });
  return response.data;
};
