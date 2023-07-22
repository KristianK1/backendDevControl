/*

specify field or complexGroupField (must have read permission)

TRIGGER: 

numeric
if value
    greater then X
    less then X
    equal to X
    inbetween these X,Y


text
if value
    starts with X
    ends with X
    contains X
    is equal to
    is not equal to

MC
if value is
    equal to X


boolean
if value is
    equal to X


RGB
if value is
    (R,G or B) 
        equal to
        greater then
        less then
        in between

RESPONSE:
    - email
    - mobile notification
    - set some value
        - what (devId, groupId, fieldId) or (devId, complexGroupId, complexGroupStateId, fieldId)
        - to what value
        - (only if I have write right to it)
        

*/