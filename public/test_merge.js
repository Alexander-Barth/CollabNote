function test() {
    var nfailed = 0;
    var npassed = 0;

    function assert(cnd) {
        if (cnd) {
            npassed++;
        } 
        else {
            nfailed++;
            console.error('assertion failed');
        }
    }

    assert(isEqual(diffset(['a','b','c'],['c']),['a','b']));

    // linear change
    var changes = [
        {
            base: [],
            id: '1:0',
            time: 0,
            add: {start: 0, data: 'Hello'}
        },
        {
            base: ['1:0'],
            id: '1:1',
            time: 0,
            add: {start: 6, data: ' world!'}
        },
        {
            base: ['1:0','1:1'],
            id: '1:2',
            time: 0,
            del: {start: 1, n: 1},
            add: {start: 1, data: 'a'}
        },
        {
            base: ['1:0','1:1','1:2'],
            id: '1:3',
            time: 0,
            del: {start: 6, n: 5},
            add: {start: 6, data: 'Welt'}
        }

    ];


    var applied_changes = [];
    var newtext = merge('',changes,applied_changes);
    assert(newtext === 'Hallo Welt!');
    assert(isEqual(['1:0','1:1','1:2','1:3'],applied_changes));


    // non-linear change
    /*

      Helloo world
          / \
         /   \
        /     \
       /       \
      /         \
Hello world   Helloo world!
      \         /
       \       /
        \     /
         \   /
          \ /
 
     */
    var changes = [
        {
            base: [],
            id: '1:0',
            time: 0,
            add: {start: 0, data: 'Hello world!'}
        },
        {
            base: ['1:0'],
            id: '2:0',
            time: 0,
            del: {start: 0, n: 5}, // delete Hello
            add: {start: 0, data: 'Hallooo'}
        },
        {
            base: ['1:0'],
            id: '1:1',
            time: 0,
            del: {start: 6, n: 5},
            add: {start: 6, data: 'Welt'}
        }

    ];


    var applied_changes = [];
    var newtext = merge('',changes,applied_changes);
    assert(newtext === 'Hallooo Welt!');
    assert(isEqual(['1:0','1:1','2:0'],applied_changes));


    var changes = [
        {
            base: [],
            id: '1:0',
            time: 0,
            add: {start: 0, data: 'Hello world!'}
        },
        {
            base: ['1:0'],
            id: '2:0',
            time: 0,
            del: {start: 0, n: 5}, // delete Hello
        },
        {
            base: ['1:0'],
            id: '2:1',
            time: 0,
            add: {start: 0, data: 'Hallooo'}
        },
   /*     {
            base: ['1:0'],
            id: '1:1',
            add: {start: 6, data: 'Welt'}
        },
        {
            base: ['1:0'],
            id: '1:3',
            del: {start: 6, n: 5},
        }
 */       
    ];


    var applied_changes = [];
    var newtext = merge('',changes,applied_changes);
    assert(newtext === 'Hallooo world!');
    assert(isEqual(['1:0','2:0','2:1'],applied_changes));
     

    // input that need to be sorted in time
    var changes = [
        {
            base: [],
            id: '2:0',
            time: 1,
            add: {start: 0, data: ' world!'}
        },
        {
            base: [],
            id: '1:0',
            time: 0,
            add: {start: 0, data: 'Hello'}
        },
    ];


    var applied_changes = [];
    var newtext = merge('',changes,applied_changes);
    assert(newtext === 'Hello world!');
    assert(isEqual(['1:0','2:0'],applied_changes));


    console.log('failed:',nfailed,' - passed: ',npassed)
}
