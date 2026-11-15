// Independent I4C specification. These tokens are proposed, not production state.
export const tokens = {
 elevation: ['#352A68','#286B9E','#4A9C9A','#B89B55','#F3E8C8'],
 slope: ['#357F78','#DCCB67','#DF8B45','#A83232'],
 thermal: ['#1E0C45','#61136E','#BC3754','#F98B0B','#F4E156'],
 hillshade: ['#000000','#808080','#FFFFFF'],
};
export function slopeClass(degrees:number|null) {
 if(degrees===null||!Number.isFinite(degrees)||degrees<0||degrees>90)return 'Unavailable';
 return degrees<10?'Low':degrees<15?'Moderate':degrees<20?'Steep':'High concern';
}
